#!/usr/bin/env node

var fs = require('fs');

var mqtt = require('mqtt');
var Twitter = require('twitter');


var conf_file = fs.readFileSync("./configuration.json");
var conf = JSON.parse(conf_file);


var NEEDED_SECOND_STATE_SAMPLES = 3;

var found_first_state = false;
var num_samples_second_state = 0;


function send_alert () {
	// Choose a message to use
	var message = conf.messages[Math.floor(Math.random() * conf.messages.length)];
	console.log(message);


	var tweeter = new Twitter({
		consumer_key: conf.twitter.consumer_key,
		consumer_secret: conf.twitter.consumer_secret,
		access_token_key: conf.twitter.access_token_key,
		access_token_secret: conf.twitter.access_token_secret
	});

	tweeter.post('statuses/update', {status: message}, function (err, tweet, response) {
		if (err) {
			console.log(err);
			return;
		}

		console.log('Sent tweet! (' + message + ')');
	});
}


var client = mqtt.connect('mqtt://localhost');

client.on('connect', function () {
	console.log('connected')

	var sub_topic = 'device/' + conf.device_type + '/' + conf.device;
	console.log('Subscribing to ' + sub_topic);

	client.subscribe(sub_topic);

	client.on('message', function (topic, message) {
		var adv_obj = JSON.parse(message.toString());

		var val = parseFloat(adv_obj[conf.key]);

		// Looking for a sudden drop in the value
		if (conf.direction == 'falling') {

			if (val > conf.high_threshold) {
				found_first_state = true;
				num_samples_second_state = 0;
			} else  if (val < conf.low_threshold) {
				num_samples_second_state += 1;

				if (num_samples_second_state == NEEDED_SECOND_STATE_SAMPLES && found_first_state) {
					send_alert();
				}
			}

		} else {
			// Looking for a rising edge
			if (val < conf.low_threshold) {
				found_first_state = true;
				num_samples_second_state = 0;
			} else  if (val > conf.high_threshold) {
				num_samples_second_state += 1;

				if (num_samples_second_state == NEEDED_SECOND_STATE_SAMPLES && found_first_state) {
					send_alert();
				}
			}
		}

	});
});

