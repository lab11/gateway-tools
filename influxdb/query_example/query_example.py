#! /usr/bin/env python3

import sys
import os

try:
    from influxdb import InfluxDBClient
except ImportError:
    print('Could not import influxdb library')
    print('sudo pip3 install influxdb')
    sys.exit(1)

try:
    import configparser
except ImportError:
    print('Could not import configparser library')
    print('sudo pip3 install configparser')
    sys.exit(1)


# check for config file
if not os.path.isfile('influxdb.conf'):
    print('Error: need a valid influxdb.conf file')
    sys.exit(1)

# hack to read sectionless ini files from: 
#   http://stackoverflow.com/a/25493615/4422122
config = configparser.ConfigParser()
with open('influxdb.conf', 'r') as f:
    config_str = '[global]\n' + f.read()
config.read_string(config_str)


print("Connecting to influxDB:\n\thost=" + config['global']['host'] +
        "\n\tport=" + config['global']['port'] + 
        "\n\tusername=" + config['global']['username'] +
        "\n\tpassword=" + config['global']['password'] +
        "\n\tdatabase=" + config['global']['database'] +
        "\n\tssl=" + str(config['global']['protocol']=='https') +
        "\n\tverify_ssl=" + str(config['global']['protocol']=='https'))
client = InfluxDBClient(host=config['global']['host'],
        port=config['global']['port'],
        username=config['global']['username'],
        password=config['global']['password'],
        database=config['global']['database'],
        ssl=(config['global']['protocol']=='https'),
        verify_ssl=(config['global']['protocol']=='https'))


# adapted from granfana.lab11.eecs.umich.edu, '15.4 Scanning' dashboard, '15.4 Channel RSSI 200ms Averages' plot, query A
result = client.query("select value from channel_11 where receiver='scanner154-uart' and device_id='scanner_1' and time>'2016-08-08T05:07:37.59Z' and time<'2016-08-08T05:08:00.00Z'")
print()
print(result)
print()

