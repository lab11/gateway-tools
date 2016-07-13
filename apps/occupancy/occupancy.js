#!/usr/bin/env node

var fs = require('fs');

var mqtt = require('mqtt');
var getmac = require('getmac');

var conf_file = fs.readFileSync("./configuration.json");
var conf = JSON.parse(conf_file);


var OCCUPANCY_TIMEOUT = 2 * 60 * 1000;
var OCCUPANCY_RESEND_INTERVAL = 1 * 60 * 1000;

// Global state about what we think the conditions are
var _occupied = false;
var _confidence = 0.0;

// What each sensor type think
var _blees_occupancy = false;
var _blink_occupancy = false;

// Helpers
var _occupancy_timeout = undefined;
var _blees_timeout = undefined;
var _blink_timeout = undefined;

getmac.getMac(function (error, macaddr) {
    console.log('Using MAC address: ' + macaddr);

    // Send to main occupancy topic
    function send () {
        var out = {
            room: conf.room,
            gateway_id: macaddr,
            occupied: _occupied,
            confidence: _confidence,
            blees_occupancy: _blees_occupancy,
            blink_occupancy: _blees_occupancy,
            time: new Date().toISOString()
        };
        client.publish('occupancy/' + conf.room, JSON.stringify(out), {retain: true});
    }

    // Periodically send the current status.
    // We do this so that downstream things know that this script hasn't broken.
    setInterval(send, OCCUPANCY_RESEND_INTERVAL);

    // Mark the room as empty
    function set_empty () {
        _occupied = false;
        _confidence = 0.3;

        // Publish a message to this effect
        send();
        console.log('Setting room (' + conf.room + ') as empty.');
    }

    var client = mqtt.connect('mqtt://localhost');

    client.on('connect', function () {
        console.log('connected');

        for (var device_type in conf.devices) {
            for (var i=0; i<conf.devices[device_type].length; i++) {
                var sub_topic = 'device/' + device_type + '/' + conf.devices[device_type][i];
                console.log('Subscribing to ' + sub_topic);
                client.subscribe(sub_topic);
            }
        }

        client.on('message', function (topic, message) {
            var adv_obj = JSON.parse(message.toString());

            if (topic.indexOf('BLEES') > -1) {
                if (adv_obj.acceleration_interval) {
                    _blees_occupancy = true;

                    // Clear this if we don't get any blees motion for a while
                    clearTimeout(_blees_timeout);
                    _blees_timeout = setTimeout(function () {
                        _blees_occupancy = false;
                    }, OCCUPANCY_TIMEOUT-50);
                }
            } else if (topic.indexOf('Blink') > -1) {
                if (adv_obj.motion_last_minute) {
                    _blink_occupancy = true;

                    // Clear this if we don't get any blink motion for a while
                    clearTimeout(_blink_timeout);
                    _blink_timeout = setTimeout(function () {
                        _blink_occupancy = false;
                    }, OCCUPANCY_TIMEOUT-50);
                }
            }

            // This is our combination function
            var occupied = _blees_occupancy || _blink_occupancy;

            // On positive, reset timeout timer and possibly send update
            // if this is a new state
            if (occupied) {

                // Clear any old timeout timer
                clearTimeout(_occupancy_timeout);

                // Time this out in some time
                _occupancy_timeout = setTimeout(set_empty, OCCUPANCY_TIMEOUT);

                // Start by checking if this is new
                if (!_occupied) {
                    // Well we are now occupied
                    _occupied = true;
                    _confidence = 1.0;

                    // Publish a message to this effect
                    send();
                    console.log('Setting room (' + conf.room + ') as occupied.');
                }
            }
        });
    });
});

