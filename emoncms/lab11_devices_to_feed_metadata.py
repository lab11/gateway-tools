#!/usr/bin/env python3

import argparse
import re
import sys

import requests
from bs4 import BeautifulSoup


desc = '''
Parse our wiki .html file and update EmonCMS to match.

You must go to the Lab Equipment page
(http://energy.eecs.umich.edu/wiki/doku.php?id=priv:equipment)
and save the HTML page locally somewhere before running this script.
'''

example = '''
Example:

{} -f device_list.html -u https://emoncms.lab11.eecs.umich.edu -k 111122223333abcdefabcdef
'''.format(sys.argv[0])

def sanitize (s):
	return re.sub(r'([^\s\w]|_)+', '', s)


parser = argparse.ArgumentParser(description=desc, epilog=example, formatter_class=argparse.RawDescriptionHelpFormatter)
parser.add_argument('--wiki',
                    required=True,
                    help='Wiki path. ex: http://energy.eecs.umich.edu/wiki')
parser.add_argument('--wiki-username',
                    required=True,
                    help='Wiki username')
parser.add_argument('--wiki-password',
                    required=True,
                    help='Wiki password')
parser.add_argument('-u', '--url',
                    required=True,
                    help='Base URL for emaoncms. Ex: https://emoncms.lab11.eecs.umich.edu')
parser.add_argument('-k', '--key',
                    required=True,
                    help='Write API key for emoncms')
parser.add_argument('-d', '--dry-run',
                    action='store_true',
                    help='Do not actually change emoncms.')


args = parser.parse_args()

devices = {}

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
				location = sanitize(tds[5].string.strip())
				description = sanitize(tds[6].string.strip())
				notes = sanitize((tds[7].string or '').strip())

				if deviceid not in devices:
					devices[deviceid] = {}
				else:
					print('DUPLICATE ID: {}'.format(deviceid))
					print('EXITING! You must fix this.')
					sys.exit(1)


				devices[deviceid]['location'] = location
				devices[deviceid]['description'] = description
				devices[deviceid]['notes'] = notes
				devices[deviceid]['devicetype'] = devicetype



def make_req (url):
	with_key = '{}/{}'.format(args.url, url)
	if '?' in url:
		with_key += '&apikey=' + args.key
	else:
		with_key += '?apikey=' + args.key
	r = requests.get(with_key)
	return r.json()

# Get and iterate all feeds
feeds = make_req('feed/list.json')
for f in feeds:

	fields = f['name'].split(':')
	if len(fields) >= 3:
		devicetype = fields[0]
		deviceid = fields[1]

		if len(fields) == 3:
			datadesc = fields[2]
			notes = ''
			description = ''
		elif len(fields) == 5:
			description = fields[2]
			notes = fields[3]
			datadesc = fields[4]
		else:
			print('Not sure how to understand: {}'.format(f['name']))
			print('It should either be in:')
			print('  <devicetype>:<id>:<data stream type>')
			print('or')
			print('  <devicetype>:<id>:<description>:<notes>:<data stream type>')
			print('')
			continue

		if deviceid in devices:
			props = devices[deviceid]

			if props['location'] != '':
				made_change = False

				# Check if there is anything new we should set
				if props['location'] != f['tag']:
					made_change = True
					print('TAG is new for {}. Setting to {}'.format(deviceid, props['location']))
					url = 'feed/set.json?id={}&fields={{"tag":"{}"}}'.format(f['id'], props['location'])
					if args.dry_run:
						print(url)
					else:
						make_req(url)

				if notes != props['notes'] or description != props['description'] or devicetype != props['devicetype']:
					made_change = True
					print('Name for {} needs to be updated.'.format(deviceid))
					new_name = '{}:{}:{}:{}:{}'.format(props['devicetype'], deviceid, props['description'], props['notes'], datadesc)
					print('  Setting to {}'.format(new_name))
					url = 'feed/set.json?id={}&fields={{"name":"{}"}}'.format(f['id'], new_name)
					if args.dry_run:
						print(url)
					else:
						make_req(url)

				if made_change:
					print('')

			else:
				print('No location for device "{}". Not updating'.format(deviceid))
				print('')

		else:
			# print('Could not find device "{}" in lab11 devices'.format(deviceid))
			# print('')
			pass

	else:
		print('Feed name "{}" is too short.'.format(f['name']))
		print('It should have more ":"')
		print('')
