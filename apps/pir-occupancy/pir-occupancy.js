#!/usr/bin/env node

var fs = require('fs');

var mqtt = require('mqtt');


var conf_file = fs.readFileSync("./configuration.json");
var conf = JSON.parse(conf_file);


var OCCUPANCY_TIMEOUT = 2 * 60 * 1000;


var _occupied = false;
var _occupancy_timeout = undefined;

// Mark the room as empty
function set_empty () {
	_occupied = false;

	// Publish a message to this effect
	var out = {
		room: conf.room,
		occupied: false,
		time: new Date().toISOString()
	};
	client.publish('occupancy/' + conf.room, JSON.stringify(out), {retain: true});

	console.log('Setting room (' + conf.room + ') as empty.');
}

// var client = mqtt.connect('mqtt://localhost');
var client = mqtt.connect('mqtt://67.194.11.78');

client.on('connect', function () {
	console.log('connected')

	for (var i=0; i<conf.devices.length; i++) {
		var sub_topic = 'device/Blink/' + conf.devices[i];
		console.log('Subscribing to ' + sub_topic);
		client.subscribe(sub_topic);
	}

	client.on('message', function (topic, message) {
		var adv_obj = JSON.parse(message.toString());

		// Check for motion
		if (adv_obj.motion_last_minute) {
			// Motion!

			// Start by checking if this is new
			if (!_occupied) {
				// Clear any old timeout timer
				clearTimeout(_occupancy_timeout);

				// Well we are now occupied
				_occupied = true;

				// Publish a message to this effect
				var out = {
					room: conf.room,
					occupied: true,
					time: new Date().toISOString()
				};
				client.publish('occupancy/' + conf.room, JSON.stringify(out), {retain: true});

				// Time this out in some time
				_occupancy_timeout = setTimeout(set_empty, OCCUPANCY_TIMEOUT);
			}
		}
	});
});

