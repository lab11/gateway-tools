#!/usr/bin/env node

// Try to shutup some of the annoying avahi warnings.
process.env['AVAHI_COMPAT_NOWARN'] = 1;

var fs           = require('fs');

var MQTTDiscover = require('mqtt-discover');
var request      = require('request');


// {
// 	"room": "<room name>",
// 	"posturl": "<url to post to>",
// 	"sensors": {
// 		"<sensor id>": {"type": "Blink", "location": "room"},
// 		"<sensor id>": {"type": "Blink", "location": "door"},
// 		"<sensor id>": {"type": "PowerBlade", "threshold": 15},
// 		"<sensor id>": {"type": "PowerBlade", "threshold": 100}
// 	}
// }
var conf_file = fs.readFileSync("./configuration.json");
var conf = JSON.parse(conf_file);

// Rate limit how often we send state updates.
var last_post_timestamp = 0;

// State of the room
var state = 'UNOCCUPIED';
var entered_unsure_timestamp = 0;

var power_states = {};
var motion_states = {'door': {}, 'room': {}};



MQTTDiscover.on('mqttBroker', function (mqtt_client) {
    console.log('Connected to MQTT ' + mqtt_client.options.href);

    // Subscribe to each of the relevant sensors
    for (var deviceid in conf.sensors) {
    	var sensor_type = conf.sensors[deviceid].type;
    	mqtt_client.subscribe('device/' + sensor_type + '/' + deviceid);
    }

    // Called when we get a packet from MQTT
    mqtt_client.on('message', function (topic, message) {
    	var now = Date.now();

        // message is Buffer
        var adv_obj = JSON.parse(message.toString());

        // Get where this came from
        var deviceid = topic.split('/')[2];
        // var deviceid = adv_obj._meta.device_id;


        // Look up what kind of sensor this is and what we should do with it.
        var sensor_type = conf.sensors[deviceid].type;

        if (sensor_type == 'PowerBlade') {
        	var threshold = conf.sensors[deviceid].threshold;
        	power_states[deviceid] = [(adv_obj.power > threshold), now];

        } else if (sensor_type == 'Blink') {
        	var location = conf.sensors[deviceid].location;
        	motion_states[location][deviceid] = [adv_obj.motion_last_minute, now];
        }

        // Condense most sensors to single booleans
        function condense (measurements) {
        	var out = false;
        	var t = 0;
        	for (var sensorid in measurements) {
        		// Check that measurement isn't super old (in the last minute)
        		if (now - measurements[sensorid][1] < 60*1000) {
        			if (measurements[sensorid][0]) {
        				out = true;
        				// Get the lastest timestamp that we saw this measurement
        				if (measurements[sensorid][1] > t) {
        					t = measurements[sensorid][1];
        				}
        			}
        		}
        	}
        	return [out, t];
        }
        var condensed = condense(power_states);
        var power = condensed[0];
        var power_time = condensed[1];
        var condensed = condense(motion_states['room']);
        var room_motion = condensed[0];
        var room_motion_time = condensed[1];
        var condensed = condense(motion_states['door']);
        var door_motion = condensed[0];
        var door_motion_time = condensed[1];

        // Save previous state so we know if it changed.
        var previous_state = state;

		// State machine
		if (state == 'UNOCCUPIED') {
			// On any detection, we move to occupied
			if (power || room_motion || door_motion) {
				state = 'OCCUPIED';
			}

		} else if (state == 'OCCUPIED') {
			// We stay here unless we see door. Then we are not sure if
			// everyone just left.
			if (door_motion) {
				state = 'UNSURE';
				entered_unsure_timestamp = now;
			}

		} else if (state == 'UNSURE') {
			// If door motion is still here, we still don't know much.
			// We stay in this state because someone must be at least
			// near the room.
			if (door_motion) {
				// stay
				entered_unsure_timestamp = now;
			} else if (!power && !room_motion) {
				// Nothing is happening. This looks like the room
				// is empty.
				state = 'UNOCCUPIED';
			} else {
				// This is where things get tricky. We need to decide whether
				// the door was because the last person left, or if someone
				// entered.
				// As a heuristic, we need to see something happen in the
				// room 15 seconds after anything happened near the door
				// in order to say there are people in the room. This handles
				// any sensor weirdness and dropped packets.
				var threshold_timestamp = entered_unsure_timestamp + (15*1000);
				if ((power && projector_time >= threshold_timestamp) ||
				    (room_motion && room_motion_time >= threshold_timestamp)) {
					// We saw some indication after the door that the room is still occupied.
					state = 'OCCUPIED';
				}
			}
		}

		// Rate limit updates
		if (previous_state != state || (now - last_post_timestamp) > 10*1000) {

			// Update last post time
			last_post_timestamp = now;

			var post = {
				room: conf.room,
				state: state
			};

			var options = {
				uri: conf.posturl,
				method: 'POST',
				json: post
			};

			request(options, function (err, response, body) {
				if (err) {
					console.log(err);
				}
				// console.log('Posted: ');
				// console.log(post);
			});

		}

    });

});

// Find MQTT server
MQTTDiscover.start();
