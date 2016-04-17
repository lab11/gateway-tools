#!/usr/bin/env node

var getmac = require('getmac');
var exec   = require('child_process').exec;
var fs     = require('fs');

var RESTART_SENSU_CMD = 'pkill -9 sensu-client';
var CONFIG_FILENAME   = '/etc/sensu/conf.d/client.json';

var output = JSON.parse(fs.readFileSync(CONFIG_FILENAME));

// Get IP address
function get_first_ip_address () {
	var os = require('os');
	var ifaces = os.networkInterfaces();

	console.log(ifaces);

	for (var ifname in ifaces) {
		if (ifname != lo) {
			return ifaces[ifname][0].address;
		}
	}
	return '';
}

if ('client' in output) {
	getmac.getMac(function (err, addr) {
		var macaddr = adddr.replace(/[^A-Z0-9-]/ig, '');
		var name = 'swarm-gateway-' + macaddr;

		output['client']['name'] = name;
		output['client']['address'] = get_first_ip_address();

		fs.writeFileSync(CONFIG_FILENAME, JSON.stringify(output));

        exec(RESTART_SENSU_CMD, function (err, stdout, stderr) {
            process.exit(0);
        });
	});
}
