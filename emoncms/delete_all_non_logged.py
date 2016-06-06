import sys

import requests

'''
Deletes all inputs which have no processes and do not have a name.
'''

base = sys.argv[1]
key = sys.argv[2]

def make_req (url):
	with_key = '{}/{}'.format(base, url)
	if '?' in url:
		with_key += '&apikey=' + key
	else:
		with_key += '?apikey=' + key
	r = requests.get(with_key)


	return r.json()

inputs = make_req('input/list.json')

for i in inputs:
	if i['processList'] == '' and i['description'] == '':
		print(i)
		make_req('input/delete.json?inputid={}'.format(i['id']))
