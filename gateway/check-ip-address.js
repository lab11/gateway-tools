#!/usr/bin/env node

// Get IP address
function get_ip_addresses () {
	var os = require('os');
	var ifaces = os.networkInterfaces();

	var out = [];

	for (var ifname in ifaces) {
		if (ifname != 'lo') {
			for (var i=0; i<ifaces[ifname].length; i++) {
				out.push(ifaces[ifname][i].address);
			}
		}
	}
	return out.join('|');
}

var addresses = get_ip_addresses();

console.log(addresses);
process.exit(0);
