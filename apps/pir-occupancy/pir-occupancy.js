#!/usr/bin/env node

var fs = require('fs');

var mqtt = require('mqtt');
var getmac = require('getmac');

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

getmac.getMac(function (error, macaddr) {
    console.log('Using MAC address: ' + macaddr);

    var client = mqtt.connect('mqtt://localhost');

    client.on('connect', function () {
        console.log('connected');

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

                // Clear any old timeout timer
                clearTimeout(_occupancy_timeout);

                // Time this out in some time
                _occupancy_timeout = setTimeout(set_empty, OCCUPANCY_TIMEOUT);

                // Start by checking if this is new
                if (!_occupied) {
                    // Well we are now occupied
                    _occupied = true;

                    // Publish a message to this effect
                    var out = {
                        room: conf.room,
                        gateway_id: macaddr,
                        occupied: true,
                        confidence: 1.0,
                        time: new Date().toISOString()
                    };
                    client.publish('occupancy/' + conf.room, JSON.stringify(out), {retain: true});
                    console.log('Setting room (' + conf.room + ') as occupied.');
                }
            }
        });
    });
});

