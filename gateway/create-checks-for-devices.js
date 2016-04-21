#!/usr/bin/env node

/* create-checks-for-devices
 *
 * This script edits the sensu-client configs to add checks
 * for all known devices. This lets us create "proxy" devices
 * which we can monitor in sensu. This tool also saves the
 * timestamp of when it saw the device, and removes old devices
 * when they timeout.
 */

// Try to shutup some of the annoying avahi warnings.
process.env['AVAHI_COMPAT_NOWARN'] = 1;

var MQTTDiscover = require('mqtt-discover');
var fs           = require('fs');
var exec         = require('child_process').exec;


// List of all topics the BLE gateway is supporting
var TOPIC_TOPICS = 'gateway-topics';

// What command each check should run to verify the device is still active.
var COMMAND_NAME = '/home/debian/gateway-tools/gateway/check-device-recent.js';

// How often the check for each device should run.
var INTERVAL_SECONDS = 30;

// Which file to read and update when creating the checks.
var CONFIG_FILENAME = '/etc/sensu/conf.d/swarm-gateway-devices.json';

// How to restart the sensu-client. We just kill it and let systemd bring
// it back.
var RESTART_SENSU_CMD = 'pkill -9 sensu-client';

// How long to wait to see a device before determining it's gone.
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
            var t = output.checks[k].timestamp;
            var n = Date.now();
            if (n-t > TIMEOUT_MILLISECONDS) {
                delete output.checks[k];
            }
        }

        // All current devices
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

        // Write the check file back to disk to configure sensu client
        fs.writeFileSync(CONFIG_FILENAME, JSON.stringify(output));

        // Restart the sensu client so that it reads in the new
        // configuration.
        exec(RESTART_SENSU_CMD, function (err, stdout, stderr) {
            process.exit(0);
        });
    });

});

// Find MQTT server
MQTTDiscover.start();
