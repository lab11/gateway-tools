#!/usr/bin/env node

var fs = require('fs');

var mqtt = require('mqtt');
var edimax = require('edimax-smartplug');

var conf_file = fs.readFileSync('./configuration.json');
var conf = JSON.parse(conf_file);

// Handle conf defaults
if ( ! ('mqttBroker' in conf) ) {
	conf.mqttBroker = 'mqtt://localhost';
}
if ( ! ('controlInvert' in conf) ) {
	conf.controlInvert = false;
}


console.log("connecting to " + conf.mqttBroker);
var client = mqtt.connect(conf.mqttBroker);

client.on('connect', function () {
	console.log('connected');

	client.subscribe(conf.controlTopic);

	client.on('message', function (topic, message) {
		var msg_obj = JSON.parse(message.toString());

		var onoff = msg_obj[conf.controlKey];

		if ( typeof onoff == 'undefined' ) {
			console.log('Error: controlKey ' + conf.controlKey + ' not found in topic object:');
			console.log(msg_obj);
			return;
		}

		if ( conf.controlInvert ) {
			onoff = !onoff;
		}

		for (var i=0; i<conf.edimaxes.length; i++) {
			edimax.setSwitchState(onoff, conf.edimaxes[i]).catch(function(e) {console.log(e)});
		}
	});
});

