#!/usr/bin/env node

/* sensu-configure-client
 *
 * Setup the /etc/sensu/conf.d/client.json file with a proper name
 * for this device. Basically, we use the MAC address to give it a
 * unique, static client identifier.
 */

var getmac = require('getmac');
var exec   = require('child_process').exec;
var fs     = require('fs');

var RESTART_SENSU_CMD = 'pkill -9 sensu-client';
var CONFIG_FILENAME   = '/etc/sensu/conf.d/client.json';

var output = JSON.parse(fs.readFileSync(CONFIG_FILENAME));

if ('client' in output) {
	getmac.getMac(function (err, addr) {
		var macaddr = addr.replace(/[^A-Z0-9-]/ig, '');
		var name = 'swarm-gateway-' + macaddr;

		output['client']['name'] = name;

		fs.writeFileSync(CONFIG_FILENAME, JSON.stringify(output));

        exec(RESTART_SENSU_CMD, function (err, stdout, stderr) {
            process.exit(0);
        });
	});
}
