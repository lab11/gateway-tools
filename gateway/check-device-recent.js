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

// How long to wait before declaring a device gone. We need this timeout
// here as well so that we can actually send an error to the sensu server.
var TIMEOUT_MILLSECONDS = 10*60*1000;

// Which file to read in to get the recent timestamp information for
// each device.
var CONFIG_FILENAME     = '/etc/sensu/conf.d/swarm-gateway-devices.json';

// Which device we should check for is passed in as the first argument.
var device_name = process.argv[2];

var config = JSON.parse(fs.readFileSync(CONFIG_FILENAME));

// Do some sanity checks for the device we are looking for.
if (('checks' in config) &&
    (device_name in config.checks) &&
    ('timestamp' in config.checks[device_name])) {

    // Check to see if this device has timed out.
    var timestamp = config.checks[device_name].timestamp;
    var n = Date.now();
    var diff = n - timestamp;
    if (diff > TIMEOUT_MILLSECONDS) {
        console.log('Device dropped from gateway-topics ' + (diff/1000) + ' seconds ago.');
        process.exit(2);
    } else {
        process.exit(0);
    }

}

// If we haven't exited by now, something is wrong, but in any case
// the device isn't present.
console.log('Error determining device.');
process.exit(1);
