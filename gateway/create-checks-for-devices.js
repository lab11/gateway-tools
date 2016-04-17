#!/usr/bin/env node

// Try to shutup some of the annoying avahi warnings.
process.env['AVAHI_COMPAT_NOWARN'] = 1;

var MQTTDiscover = require('mqtt-discover');
var fs           = require('fs');
var exec         = require('child_process').exec;


// List of all topics the BLE gateway is supporting
var TOPIC_TOPICS = 'gateway-topics';

var COMMAND_NAME = '/home/debian/gateway-tools/gateway/check-device-recent.js';
// var COMMAND_NAME = 'true';

var INTERVAL_SECONDS = 30;

var CONFIG_FILENAME = '/etc/sensu/conf.d/swarm-gateway-devices.json';

// var RESTART_SENSU_CMD = 'systemctl restart sensu-client';
var RESTART_SENSU_CMD = 'pkill -9 sensu-client';

var TIMEOUT_MILLISECONDS = 7*60*1000;

// Callback after we have found a MQTT broker.
MQTTDiscover.on('mqttBroker', function (mqtt_client) {
    // console.log('Connected to MQTT at ' + mqtt_client.options.href);

    // On connect we subscribe to all formatted data packets
    mqtt_client.subscribe(TOPIC_TOPICS);

    // Called when we get a packet from MQTT
    mqtt_client.once('message', function (topic, message) {
        // message is Buffer
        var device_list = JSON.parse(message.toString());

        // Read in existing device list
        var output = {checks: {}};
        try {
            output = JSON.parse(fs.readFileSync(CONFIG_FILENAME));
        } catch (e) {}

        // Remove stale devices that have failed.
        for (var k in output.checks) {
            var t = output.checks[k];
            var n = Date.now();
            if (n-t > TIMEOUT_MILLISECONDS) {
                delete output.checks[k];
            }
        }

        // All all current devices
        for (var i=0; i<device_list.length; i++) {
            var fields = device_list[i].split('/');
            if (fields.length == 3) {
                var type = fields[1];
                var addr = fields[2];

                var name = type + '-' + addr;
                name = name.replace(/[^A-Z0-9-]/ig, '_');

                output.checks[name] = {
                    command: COMMAND_NAME + ' ' + name,
                    standalone: true,
                    interval: INTERVAL_SECONDS,
                    source: name,
                    timestamp: Date.now()
                };
            }
        }

        // console.log(JSON.stringify(output));

        fs.writeFileSync(CONFIG_FILENAME, JSON.stringify(output));

        exec(RESTART_SENSU_CMD, function (err, stdout, stderr) {
            process.exit(0);
        });
    });

});

// Find MQTT server
MQTTDiscover.start();
