#!/usr/bin/env python3

import json
import sys

import bottle
import influxdb


CONFIG_FILE_PATH = "/etc/swarm-gateway/awair-server.conf"

config = {}
with open(CONFIG_FILE_PATH) as f:
    for l in f:
        fields = l.split("=")
        if len(fields) == 2:
            config[fields[0].strip()] = fields[1].strip()


@bottle.route("/")
def index():
    awairs = {}

    client = influxdb.InfluxDBClient(
        config["influx_url"],
        config["influx_port"],
        config["influx_username"],
        config["influx_password"],
        config["influx_database"],
        ssl=int(config["influx_port"]) == 443,
        gzip=int(config["influx_port"]) == 443,
        verify_ssl=int(config["influx_port"]) == 443,
    )

    query = '''SELECT last("value") FROM "ipv4_address" GROUP BY "device_id"'''
    result = client.query(query)
    entries = result.items()

    for entry in entries:
        device_id = entry[0][1]["device_id"]

        for point in entry[1]:
            awairs[device_id] = point["last"]
            break

    out = {"awairs": awairs}
    return out


bottle.run(host="localhost", port=config["server_port"])
