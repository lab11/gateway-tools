#!/usr/bin/env node

var url     = require('url');
var fs      = require('fs');

var ini     = require('ini');

var express           = require('express');
var expressBodyParser = require('body-parser')


const { Client } = require('pg');


async function start() {

	// Read in the config file to get the parameters. If the parameters are not set
	// or the file does not exist, we exit this program.
	try {
		var config_file = fs.readFileSync('/etc/swarm-gateway/influxdb-postgres-meta.conf', 'utf-8');
		var config = ini.parse(config_file);
		if (config.host == undefined || config.host == '' ||
		    config.port == undefined || config.port == '' ||
		    config.protocol == undefined || config.protocol == '' ||
		    config.listen_port == undefined || config.listen_port == '' ||
		    config.postgres_host == undefined || config.postgres_host == '' ||
		    config.postgres_port == undefined || config.postgres_port == '' ||
		    config.postgres_db == undefined || config.postgres_db == '') {
		    config.postgres_user == undefined || config.postgres_user == '') {
		    config.postgres_password == undefined || config.postgres_password == '') {
			throw new Exception('no settings');
		}
	} catch (e) {
		console.log(e)
		console.log('Could not find /etc/swarm-gateway/influxdb-postgres-meta.conf or influxdb not configured.');
		process.exit(1);
	}

	// Setup a client to the database
	const db = new Client({
		user: config.postgres_user,
		host: config.postgres_host,
		database: config.postgres_db,
		password: config.postgres_password,
		port: config.postgres_port,
	});

	// Connect to the postgres database
	await db.connect();

	async function get_device (device_id) {
		const res = await db.query('SELECT * FROM devices WHERE sensorid=$1::text LIMIT 1', [device_id]);
		if (res) {
			delete res.sensorid;
			delete res.type;
			return res;
		}
	}

 // // Populate the meta data to start
 // var _devices = {};
 // function update_local_meta () {
 // 	get_wiki_devices(config.wiki_username, config.wiki_password, config.wiki_url, function (err, devices) {
 // 		if (err) {
 // 			console.log('Error getting wiki device meta list.')
 // 			console.log(err)
 // 			return;
 // 		}
 // 		console.log('Updated device meta registry.');
 // 		_devices = devices;
 // 	});
 // }
 // update_local_meta();

 // // Now do that every 5 minutes so it stays current
 // setInterval(update_local_meta, 5 * 60 * 1000);




	// And setup the HTTP server
	var _app = express();
	// _app.use(expressBodyParser.text());
	_app.use(expressBodyParser.text({type: function () {return true;}}));

	// Main path that intercepts the write to the influx database
	_app.post('/swarmgateway/write', function (req, res) {

		var body = req.body;
		var lines = body.split('\n');

		var new_lines = [];
		for (var i=0; i<lines.length; i++) {
			var line = lines[i];

			// Check there is something here
			if (line.length == 0) continue;

			// Split based on space, while respecting quoted strings
			var pieces = line.match(/(?:[^\s"\\]+|"[^"]*"|\\\s)+/g);

			// Sanity check
			if (pieces.length >= 2) {

				// Get the device id from the influx db line format
				var device_id_index = pieces[0].indexOf('device_id');
				if (device_id_index > -1) {
					var end_index = pieces[0].indexOf(',', device_id_index);
					var device_id = pieces[0].slice(device_id_index+10, end_index);

					// Lookup if we know anything about that device
					device = get_device(device_id);
					if (device) {
						// Add the meta data
						var addon = '';

						// Escape " ", ",", and "=".
						function sanitize_tag (tag) {
							return tag.replace(/ /g, '\\ ').replace(/,/g, '\\,').replace(/=/g, '\\=');
						}

						for (key in device) {
							if (device[key].length > 0) {
								addon += ','+key+'=' + sanitize_tag(device[key]);
							}
						}

						// And actually tack it to the post body
						pieces[0] += addon;
					}
				}
			}

			// Put the line back together
			var new_line = pieces.join(' ');
			new_lines.push(new_line);
		}

		// Again, no need to publish nothing
		if (new_lines.length > 0) {

			// And put the body back together
			var new_body = new_lines.join('\n');

			// Get the URL to post to for the real influx db
			var post_url = req.originalUrl.split('/swarmgateway')[1];
			var post_base = url.format({
				protocol: config.protocol,
				hostname: config.host,
				port: config.port
			});

			// And create a request options to keep this going
			var request_options = {
				url: post_base + post_url,
				body: new_body,
				method: 'POST',
				retries: 1,
				timeout: null
			};

			// Now make the request to the actual database and return whatever
			// it returns
			request(request_options, function (err, response, body) {
				res.status(response.statusCode);
				res.send(body);
			});
		} else {
			res.send('');
		}
	});

	_app.listen(config.listen_port, function () {
		console.log('Listening for incoming influxdb data to add meta data to.');
	});






}

start();

// function get_wiki_devices (username, password, base_url, cb) {
// 	devices = {};
//
// 	// Get the wiki page
// 	var url = base_url + '/doku.php?id=priv:equipment'
// 	var data = {
// 		do: 'login',
// 		u: username,
// 		p: password,
// 		r: '1'
// 	}
//
// 	request.post({url:url, form:data, followAllRedirects: true, jar: true}, function (err, httpResponse, body) {
// 		if (err) {
// 			cb(err);
// 			return;
// 		}
//
// 		var $ = cheerio.load(body);
//
// 		var tables = $('table');
// 		for (var i=0; i<tables.length; i++) {
// 			var table = tables[i];
// 			var ths = $(table).find('th');
//
// 			if (ths.length === 8 &&
// 				$(ths[0]).text().trim() === '#' &&
// 				$(ths[1]).text().trim() === 'Device Type' &&
// 				$(ths[2]).text().trim() === 'Device Hostname' &&
// 				$(ths[3]).text().trim() === 'IP Address' &&
// 				$(ths[4]).text().trim() === 'Device ID' &&
// 				$(ths[5]).text().trim() === 'Location' &&
// 				$(ths[6]).text().trim() === 'Description' &&
// 				$(ths[7]).text().trim() === 'Notes') {
//
// 				var rows = $(table).find('tr');
// 				for (var k=0; k<rows.length; k++) {
// 					var row = rows[k];
// 					var cols = $(row).find('td');
//
// 					if (cols.length == 8) {
// 						var deviceid = $(cols[4]).text().trim().toLowerCase().replace(/:/g, '');
// 						var node = {
// 							location:    $(cols[5]).text().trim(),
// 							description: $(cols[6]).text().trim(),
// 							notes:       $(cols[7]).text().trim()
// 						};
//
// 						devices[deviceid] = node;
// 					}
// 				}
// 			}
// 		}
// 		cb(null, devices);
// 	});
// }
//
// Read
