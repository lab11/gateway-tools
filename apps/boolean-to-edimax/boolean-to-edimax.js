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
if ( ! ('coalesceEvents' in conf) ) {
	conf.coalesceEvents = true;
}


console.log("connecting to " + conf.mqttBroker);
var client = mqtt.connect(conf.mqttBroker);



function setEdimaxesPowerState (onoff, edimaxes) {
	if ( typeof edimaxes == 'undefined' ) {
		edimaxes = conf.edimaxes;
	}

	for (var i=0; i<edimaxes.length; i++) {
		edimax.setSwitchState(onoff, edimaxes[i]).catch(function(e) {console.log(e)});
	}
}


var warningTimeout = null;
function warnLightsOff (count) {
	if (typeof count == 'undefined') {
		count = 0;
	}

	// Blink a light three times and then wait 30s before actually turning off
	// the lights. Calling clearTimeout(warningTimeout) will abort the shutoff.
	// The warning light will remain off during the 30s warning interval, callers
	// that abort shutoff should power it back on to notify of the cancellation
	var light = conf.edimaxes.slice(0,1);

	if ((count % 2) == 0) {
		setEdimaxesPowerState(false, light);
		warningTimeout = setTimeout(function () {
			warnLightsOff(count + 1);
		}, 1000*1);
	} else if (count < 7) {
		setEdimaxesPowerState(true, light);
		warningTimeout = setTimeout(function () {
			warnLightsOff(count + 1);
		}, 1000*1);
	} else {
		warningTimeout = setTimeout(function () {
			setEdimaxesPowerState(false);
		}, 1000*30);
	}
}

client.on('connect', function () {
	console.log('connected');

	client.subscribe(conf.controlTopic);

	var lastMessage = undefined;

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

		if ( conf.coalesceEvents ) {
			if ( lastMessage == onoff ) {
				return;
			}
			lastMessage = onoff;
		}

		if (onoff) {
			// Turn on immediately
			setEdimaxesPowerState(onoff);

			// Cancel any pending off event
			if ( warningTimeout != null ) {
				clearTimeout(warningTimeout);
				warningTimeout = null;
			}
		} else {
			warnLightsOff();
		}
	});
});

