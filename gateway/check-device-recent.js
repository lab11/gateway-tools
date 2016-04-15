#!/usr/bin/env node

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
