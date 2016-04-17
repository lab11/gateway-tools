#!/usr/bin/env node

var getmac = require('getmac');
var exec   = require('child_process').exec;
var fs     = require('fs');

var CONFIG_FILENAME     = '/etc/sensu/conf.d/client.json';

var output = JSON.parse(fs.readFileSync(CONFIG_FILENAME));

// Get IP address
function get_first_ip_address () {
	var os = require('os');
	var ifaces = os.networkInterfaces();

	for (var ifname in ifaces) {
		if (ifname != lo) {
			return ifaces[ifname].address;
		}
	}
	return '';
}

if ('client' in output) {
	getmac.getMac(function (err, addr) {
		var name = 'swarm-gateway-' + addr;

		output['client']['name'] = name;
		output['client']['address'] = get_first_ip_address();

		fs.writeFileSync(CONFIG_FILENAME, JSON.stringify(output));

        exec(RESTART_SENSU_CMD, function (err, stdout, stderr) {
            process.exit(0);
        });
	});
}
