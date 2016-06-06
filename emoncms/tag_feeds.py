#!/usr/bin/env python3

import sys

import requests

'''
Adds tag to feeds whose name contains a string.
'''


base = sys.argv[1]
key = sys.argv[2]
node = sys.argv[3]
tag = sys.argv[4]

def query_yes_no(question, default="yes"):
	"""Ask a yes/no question via raw_input() and return their answer.

	"question" is a string that is presented to the user.
	"default" is the presumed answer if the user just hits <Enter>.
		It must be "yes" (the default), "no" or None (meaning
		an answer is required of the user).

	The "answer" return value is True for "yes" or False for "no".
	"""
	valid = {"yes": True, "y": True, "ye": True,
			 "no": False, "n": False}
	if default is None:
		prompt = " [y/n] "
	elif default == "yes":
		prompt = " [Y/n] "
	elif default == "no":
		prompt = " [y/N] "
	else:
		raise ValueError("invalid default answer: '%s'" % default)

	while True:
		sys.stdout.write(question + prompt)
		choice = input().lower()
		if default is not None and choice == '':
			return valid[default]
		elif choice in valid:
			return valid[choice]
		else:
			sys.stdout.write("Please respond with 'yes' or 'no' "
							 "(or 'y' or 'n').\n")


query_yes_no('Add tag "{}" to all feed names containing "{}"?'.format(tag, node))

def make_req (url):
	with_key = '{}/{}'.format(base, url)
	if '?' in url:
		with_key += '&apikey=' + key
	else:
		with_key += '?apikey=' + key
	r = requests.get(with_key)
	return r.json()

feeds = make_req('feed/list.json')

for f in feeds:
	if node in f['name']:
		print(f)
		make_req('feed/set.json?id={}&fields={{"tag":"{}"}}'.format(f['id'], tag))
