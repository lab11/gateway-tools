#!/usr/bin/env python3

import argparse
import json
import re
import sys
import time

import requests
from bs4 import BeautifulSoup
import pika



desc = '''
Parse our wiki .html file and update sensu
'''


def sanitize (s):
	s = re.sub(r'([^\s\w]|_)+', '', s)
	s = s.replace(' ', '-')
	return s


parser = argparse.ArgumentParser(description=desc, formatter_class=argparse.RawDescriptionHelpFormatter)
parser.add_argument('--wiki',
                    required=True,
                    help='Wiki path. ex: http://energy.eecs.umich.edu/wiki')
parser.add_argument('--wiki-username',
                    required=True,
                    help='Wiki username')
parser.add_argument('--wiki-password',
                    required=True,
                    help='Wiki password')
parser.add_argument('--host',
                    required=True,
                    help='RabbitMQ host')
parser.add_argument('--port',
                    required=True,
                    help='RabitMQ port')
parser.add_argument('-v', '--vhost',
                    required=True,
                    help='RabitMQ virtual host')
parser.add_argument('-u', '--user',
                    required=True,
                    help='RabitMQ user')
parser.add_argument('-p', '--password',
                    required=True,
                    help='RabitMQ password')
parser.add_argument('--sensu',
                    required=True,
                    help='Sensu URL (ex: https://sensu.com')
parser.add_argument('--sensu-username',
                    required=True,
                    help='Sensu username')
parser.add_argument('--sensu-password',
                    required=True,
                    help='Sensu password')
parser.add_argument('-d', '--dry-run',
                    action='store_true',
                    help='Do not actually change emoncms.')


args = parser.parse_args()

devices = {}

amqp_conn = pika.BlockingConnection(
            pika.ConnectionParameters(
                    host=args.host,
                    virtual_host=args.vhost,
                    credentials=pika.PlainCredentials(
                        args.user,
                        args.password))
            )
amqp_chan = amqp_conn.channel()

now = time.time()

# Get the wiki page
url = '{}/doku.php?id=priv:equipment'.format(args.wiki)
data = {
	'do': 'login',
	'u': args.wiki_username,
	'p': args.wiki_password,
	'r': '1'
}
devices_html_req = requests.post(url, data=data)

# Read in all known devices from wiki
soup = BeautifulSoup(devices_html_req.text, 'html.parser')

# Get all tables in the lab equipment page
tables = soup.find_all('table')

# Now find the ones with deployed devices
num_wiki_devices = 0
for table in tables:
	cols = table.thead.find_all('th')
	if len(cols) == 8 and\
	   cols[0].string.strip() == '#' and\
	   cols[1].string.strip() == 'Device Type' and\
	   cols[2].string.strip() == 'Device Hostname' and\
	   cols[3].string.strip() == 'IP Address' and\
	   cols[4].string.strip() == 'Device ID' and\
	   cols[5].string.strip() == 'Location' and\
	   cols[6].string.strip() == 'Description' and\
	   cols[7].string.strip() == 'Notes':

		rows = table.find_all('tr')
		for row in rows:
			tds = row.find_all('td')
			if len(tds) == 8:
				deviceid = tds[4].string.strip().lower().replace(':', '')
				devicetype = sanitize(tds[1].string.strip())
				location = tds[5].string.strip()
				description = tds[6].string.strip()
				notes = (tds[7].string or '').strip()

				if devicetype == '':
					continue

				devicename = '{}-{}'.format(devicetype, deviceid)

				if devicename in devices:
					print('DUPLICATE ID: {}'.format(deviceid))
					print('EXITING! You must fix this.')
					sys.exit(1)


				meta_info = '{}:{}:{}'.format(location, description, notes)
				print(meta_info)

				out = {
					"client": devicename,
					"check": {
						"command": sys.argv[0],
						"standalone": True,
						"interval": 120,
						"source": devicename,
						"timestamp": int(now * 1000),
						"name": "meta-information",
						"issued": int(now),
						"executed": int(now),
						"duration": 1,
						"output": meta_info,
						"status": 0
					}
				}

				devices[devicename] = out

				num_wiki_devices += 1

print('Found {} devices on the wiki'.format(num_wiki_devices))
if num_wiki_devices == 0:
	print('No devices found on wiki. Likely wrong password?')
	sys.exit(1)

# Get list from sensu so we know which devices to actually publish

url = '{}/login'.format(args.sensu)
payload = {'pass': args.sensu_password, 'user': args.sensu_username}
headers = {'content-type': 'application/json'}

login = requests.post(url, data=json.dumps(payload), headers=headers).json()
token = login['Token']

url = '{}/clients'.format(args.sensu)
clients = requests.get(url, headers={'Authorization':'Bearer {}'.format(token)}).json();

for client in clients:
	name = client['name']
	if name in devices:
		print(devices[name])

		if not args.dry_run:
			amqp_chan.basic_publish(exchange='results', body=json.dumps(devices[name]), routing_key='')
