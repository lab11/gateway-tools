#!/usr/bin/env node

/* check-device-recent
 *
 * This check monitors if devices have been seen recently. It uses
 * help from the create-checks-for-devices check as that script adds
 * the last known timestamp for each device. This check simply checks
 * that timestamp and implements a timeout. This work has to be split
 * to fit into the sensu framework.
 */

var fs = require('fs');

var TIMEOUT_MILLSECONDS = 5*60*1000;
var CONFIG_FILENAME     = '/etc/sensu/conf.d/swarm-gateway-devices.json';

var device_name = process.argv[2];

var output = JSON.parse(fs.readFileSync(CONFIG_FILENAME));

if ('checks' in output) {
    if (device_name in output.checks) {
        if ('timestamp' in output.checks[device_name]) {
            var timestamp = output.checks[device_name].timestamp;
            var n = Date.now();
            var diff = n - timestamp;
            if (diff > TIMEOUT_MILLSECONDS) {
                console.log('Device dropped from gateway-topics .');
                process.exit(2);
            } else {
                process.exit(0);
            }
        }
    }
}

console.log('Error determining device.');
process.exit(1);
