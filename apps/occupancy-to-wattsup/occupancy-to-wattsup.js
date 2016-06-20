#!/usr/bin/env node

var fs   = require('fs');
var http = require('http');

var mqtt = require('mqtt');


var conf_file = fs.readFileSync("./configuration.json");
var conf = JSON.parse(conf_file);

var _occupied = true;



/******************************************************************************/
// Occupancy events
/******************************************************************************/

var client = mqtt.connect('mqtt://localhost');

client.on('connect', function () {
	console.log('connected')

	var occupancy_topic = 'occupancy/' + conf.room;
	console.log('Subscribing to ' + occupancy_topic);
	client.subscribe(occupancy_topic);

	var door_topic = '';
	if (conf.door_device) {
		door_topic = 'device/' + conf.door_device + '/' + conf.door_device_id;
		console.log('Subscribing to ' + door_topic);
		client.subscribe(door_topic);
	}

	client.on('message', function (topic, message) {
		var adv_obj = JSON.parse(message.toString());

		if (topic == occupancy_topic) {
			// This is the main arbiter of occupancy
			console.log('setting local occupancy variable to ' + adv_obj.occupied + ' because of main occupancy stream');
			_occupied = adv_obj.occupied;

		} else if (topic == door_topic) {
			// Use this to try to eek out a little more responsiveness
			if (adv_obj.type == 'door_unlocked') {
				console.log('setting local occupancy variable to true because of door unlocked');
				_occupied = true;
			}
		}

	});
});

/******************************************************************************/
// Listen for wattsup
/******************************************************************************/

server = http.createServer( function(req, res) {
    if (req.method == 'POST') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        if (_occupied) {
        	// Make sure lights are on
        	res.end('[0]');
        } else {
        	// Turn em off
        	res.end('[1]');
        }
    }

});

var host = '0.0.0.0';
server.listen(conf.wattsup_port, host);
console.log('Listening at http://' + host + ':' + conf.wattsup_port);

