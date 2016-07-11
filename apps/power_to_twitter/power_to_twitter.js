#!/usr/bin/env node

var fs = require('fs');

var mqtt = require('mqtt');
var Twitter = require('twitter');


var conf_file = fs.readFileSync("./configuration.json");
var conf = JSON.parse(conf_file);


var NEEDED_FIRST_STATE_TIME = 30 * 60 * 1000;
var NEEDED_SECOND_STATE_SAMPLES = 3;

var state = 'UNKNOWN';
var time_first_state_start = 0;
var num_samples_second_state = 0;


function send_alert () {
	// Choose a message to use
	var message = conf.messages[Math.floor(Math.random() * conf.messages.length)];
	var msecs = Date.now() - time_first_state_start;

	var hours = Math.floor(msecs / (60 * 60 * 1000));

	var time_messages = [];
	if (hours == 0) {
		time_messages = [
			"It didn't take too long.",
			"Short print.",
			"Couldn't you make something bigger?",
			"It's not big.",
			"And I got it done fast.",
			"Make the next one take longer than an hour."
		];
	} else if (hours > 10) {
		time_messages = [
			"But man that took a while!!",
			"And really? How would you like working for " + hours + " hours",
			"But why such a big print?"
		];
	} else if (hours == 1) {
		time_messages = [
			"And it only took an hour",
			"I do good work in an hour"
		];
	} else {
		time_messages = [
			"And it only took " + hours + " hours.",
			"I do good work in " + hours + " hours."
		];
	}

	var time_message = time_messages[Math.floor(Math.random() * time_messages.length)];
	message = message + " " + time_message;

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

			// retry
			send_alert();
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

			// Ok got a high point
			if (val > conf.high_threshold) {

				if (state == 'HIGH') {
					// Just stay in this state.
					return;
				}

				// If we are not rising or high, we should be, but we want to
				// reset things
				if (state != 'RISING') {
					// Go to rising state and reset
					state = 'RISING';
					time_first_state_start = Date.now();

				} else {
					// See if we have enough high to say we are officially
					// in the high state
					if (Date.now() - time_first_state_start >= NEEDED_FIRST_STATE_TIME) {
						state = 'HIGH';
						console.log('Found HIGH state');
					}
				}



			// Got low reading
			} else  if (val < conf.low_threshold) {

				// If we were high, then this may be the edge we care about
				if (state == 'HIGH') {
					state = 'FALLING';
					num_samples_second_state = 0;
					console.log('Detected falling');
				}


				if (state == 'FALLING') {
					// Increment this to make sure this wasn't a fluke point
					num_samples_second_state += 1;

					if (num_samples_second_state == NEEDED_SECOND_STATE_SAMPLES) {
						state = 'LOW';
						send_alert();
					}

				} else {
					// Have to go low at this point. If we see a low point,
					// we want to be either low or falling
					state = 'LOW';
				}

			}

		} else {
			// TODO
		}

	});
});

