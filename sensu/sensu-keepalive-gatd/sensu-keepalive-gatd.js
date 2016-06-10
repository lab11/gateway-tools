#! /usr/bin/env nodejs
/* Pull keepalive data from sensu and log to GATD */
"use strict";

// Libraries
var fs       = require('fs');
var ini      = require('ini');
var amqp     = require('amqp');
var request  = require('request');
var watchout = require('watchout');

// get amqp config file
try {
    var amqp_config_file = fs.readFileSync('sensu.conf', 'utf-8');
    var amqp_config = ini.parse(amqp_config_file);
    if (!amqp_config || !amqp_config.host || !amqp_config.port ||
            !amqp_config.vhost || !amqp_config.user || !amqp_config.password) {
        throw new Exception('Invalid settings');
    }
} catch (e) {
    console.log(e);
    console.log("Could not find valid sensu.conf file");
    process.exit(1);
}
var device_filters;
if (amqp_config.ignore) {
    device_filters = amqp_config.ignore.split(',');
}

// get gatd config file
try {
    var gatd_config_file = fs.readFileSync('gatd.conf', 'utf-8');
    var gatd_config = ini.parse(gatd_config_file);
    if (!gatd_config || !gatd_config.sensu_post_url) {
        throw new Exception('Invalid settings');
    }
} catch (e) {
    console.log(e);
    console.log("Could not find valid gatd.conf file");
    process.exit(1);
}


// Configuration
var POST_BUFFER_LEN = 100; // group N packets into a single post to GATD
var POST_TIMEOUT = 30; // after N seconds, just post anyway

var AMQP_TIMEOUT = 300; // after N seconds, consider AMQP down
var GATD_TIMEOUT = 300; // after N seconds, consider GATD down 


// Code
var amqp_watchdog = new watchout(AMQP_TIMEOUT*1000, function (canceled) {
    if (!canceled) {
        console.log("AMQP watchdog tripped");
        process.exit(1);
    }
});

var gatd_watchdog = new watchout(GATD_TIMEOUT*1000, function (canceled) {
    if (!canceled) {
        console.log("GATD watchdog tripped");
        process.exit(1);
    }
});

var amqp_conn = amqp.createConnection({
        host: amqp_config.host,
        port: amqp_config.port,
        vhost: amqp_config.vhost,
        login: amqp_config.user,
        password: amqp_config.password});
amqp_conn.on('ready', function () {
    console.log('Connected to AMQP: ' + amqp_config.host);
    amqp_conn.exchange('keepalives', {type: 'direct', autoDelete: false}, function (exchange) {
        amqp_conn.queue('', function (queue) {
            queue.bind(exchange, '', function () {
                queue.subscribe(function (message) {
                    // got a packet, reset watchdog
                    amqp_watchdog.reset();

                    // keepalive from sensu, need to interperate
                    if (message.data) {
                        message = JSON.parse(message.data.toString());
                    }

                    post_to_gatd(message);
                });
            });
        });
    });
});

// post JSON advertisements to GATD
var post_buffer = [];
var last_post_time = 0;
function post_to_gatd (message) {
    var curr_time = Date.now()/1000;

    // buffer several advertisements and post the entire list to GATD
    post_buffer.push(message);
    //console.log("Post buffer len: " + post_buffer.length + "\t Time since post: " + (curr_time-last_post_time));
    if (post_buffer.length > POST_BUFFER_LEN || (curr_time-last_post_time) > POST_TIMEOUT) {
        //console.log("Posting to GATD");
        last_post_time = curr_time;
        var buf = post_buffer;
        post_buffer = [];

        // send array to GATD
        var req = {
            url: gatd_config.sensu_post_url,
            method: "POST",
            json: buf,
        };
        request(req, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                //console.log("Post to GATD successful");

                // post successful, reset watchdog
                gatd_watchdog.reset();
            } else {
                console.log(error);
            }
        });
    }
}

