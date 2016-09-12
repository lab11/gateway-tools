#! /usr/bin/env python3

import sys
import os
import bisect
import math
from datetime import datetime
import re

def printTime(time):
    time = str(time)
    timelist = time.replace(':','.').split('.')

    #sys.stdout.write('\r')

    if(int(timelist[0]) > 0):
        sys.stdout.write('%s h, ' % (timelist[0]))
    if(int(timelist[1]) > 0):
        sys.stdout.write('%s m, ' % (timelist[1]))
    if(int(timelist[2]) > 0):
        sys.stdout.write('%s s, ' % (timelist[2]))
    if(int(timelist[3]) > 0):
        sys.stdout.write('%s ms' % (str(round(int(timelist[3])/1000))))

    sys.stdout.write('\n')
    sys.stdout.flush()

def binsearch(a, x):
    x_day = x.split("T")[0]
    x_time = x.split("T")[1].split(".")[0]

    minVal = 0
    maxVal = len(a)-1
    # print(x)
    # exit()

    while 1:

        #print(str(minVal) + " " + str(maxVal))
        if(minVal > maxVal):
            return -1

        tempIndex = math.floor((minVal + maxVal)/2)

        a_day = a[tempIndex]['time'].split("T")[0]
        a_time = a[tempIndex]['time'].split("T")[1].split(".")[0]

        #print(a_day + " " + a_time + " " + x_day + " " + x_time)

        if(a_day < x_day):
            minVal = tempIndex + 1
        elif(a_day > x_day):
            maxVal = tempIndex - 1
        else:
            if(a_time < x_time):
                minVal = tempIndex + 1
            elif(a_time > x_time):
                maxVal = tempIndex - 1
            else:
                return tempIndex

        # if(a[tempIndex]['time'] < x):
        #     minVal = tempIndex + 1
        # elif(a[tempIndex]['time'] > x):
        #     maxVal = tempIndex - 1
        # else:
        #     return tempIndex

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

devices = ['c098e59000b4', 'c098e59000b3', 'c098e59000b7', 'c098e59000b0', 'c098e59000b8', 'c098e59000af', 'c098e59000b2', 'c098e59000b5']
errct = []

print("Starting process at " + str(datetime.now()))
print("Connecting to influxDB")

startTime = datetime.now()
actStartTime = startTime

# print("Connecting to influxDB:\n\thost=" + config['global']['host'] +
#         "\n\tport=" + config['global']['port'] + 
#         "\n\tusername=" + config['global']['username'] +
#         "\n\tpassword=" + config['global']['password'] +
#         "\n\tdatabase=" + config['global']['database'] +
#         "\n\tssl=" + str(config['global']['protocol']=='https') +
#         "\n\tverify_ssl=" + str(config['global']['protocol']=='https'))
print
client = InfluxDBClient(host=config['global']['host'],
        port=config['global']['port'],
        username=config['global']['username'],
        password=config['global']['password'],
        database=config['global']['database'],
        ssl=(config['global']['protocol']=='https'),
        verify_ssl=(config['global']['protocol']=='https'))


# adapted from granfana.lab11.eecs.umich.edu, '15.4 Scanning' dashboard, '15.4 Channel RSSI 200ms Averages' plot, query A
#result = client.query("select value from channel_11 where receiver='scanner154-uart' and device_id='scanner_1' and time>'2016-08-08T05:07:37.59Z' and time<'2016-08-08T05:08:00.00Z'")
#result = client.query("select * from motion_last_minute where device_id='c098e59000b4' or device_id='c098e59000b3' or device_id='c098e59000b7' or device_id='c098e59000b0' or device_id='c098e59000b8' or device_id='c098e59000af' or device_id='c098e59000b2' or device_id='c098e59000b5'")

rowlimit = 100000000
if len(sys.argv) == 2:
    rowlimit = int(sys.argv[1])
    print("Limiting to " + str(rowlimit) + " rows")


for devItem in devices:

    print()
    print("Starting " + str(devItem))
    fout = open('blink_' + str(devItem) + '.csv', 'w')
    #printTime(datetime.now() - startTime)

    sys.stdout.write("\rQuerying min data")
    result_min = client.query("select * from motion_last_minute where device_id=\'" + devItem + "\' and (gateway_id='c0:98:e5:c0:00:25' or gateway_id='c0:98:e5:c0:00:26' or gateway_id='c0:98:e5:c0:00:03') order by time asc limit " + str(rowlimit))
    sys.stdout.write(" - ")
    printTime(datetime.now() - startTime)
    startTime = datetime.now()
    sys.stdout.write("\rQuerying adv data")
    result_adv = client.query("select * from motion_since_last_adv where device_id=\'" + devItem + "\' and (gateway_id='c0:98:e5:c0:00:25' or gateway_id='c0:98:e5:c0:00:26' or gateway_id='c0:98:e5:c0:00:03') order by time asc limit " + str(rowlimit))
    sys.stdout.write(" - ")
    printTime(datetime.now() - startTime)
    startTime = datetime.now()
    sys.stdout.write("\rQuerying now data")
    result_now = client.query("select * from current_motion where device_id=\'" + devItem + "\' and (gateway_id='c0:98:e5:c0:00:25' or gateway_id='c0:98:e5:c0:00:26' or gateway_id='c0:98:e5:c0:00:03') order by time asc limit " + str(rowlimit))
    sys.stdout.write(" - ")
    printTime(datetime.now() - startTime)
    startTime = datetime.now()
    #print()
    #print(result_min)
    #print(result.get_points)
    #print(list(result_min.get_points('motion_last_minute')))
    #print(list(result_adv.get_points('motion_since_last_adv'))[0])
    #print(list(result_now.get_points('current_motion'))[0])
    #print()



    list_min = list(result_min.get_points('motion_last_minute'))
    list_adv = list(result_adv.get_points('motion_since_last_adv'))
    list_now = list(result_now.get_points('current_motion'))

    # print(list_min)
    # print(list_adv)
    # print(list_now)
    # exit()

    numerrors = 0

    for min_id, min_item in enumerate(list_min):
        formatStr = "{0:." + str(2) + "f}"
        percent = formatStr.format(100*((min_id+1)/float(len(list_min))))
        filledlength = int(round(100*(min_id+1)/float(len(list_min))))
        bar = '█' * filledlength + '-' * (100-filledlength)
        sys.stdout.write('\r%s |%s| %s%s %s' % ("Progress:", bar, percent, '%', 'Complete'))
        sys.stdout.flush()
        adv_savId = -1
        now_savId = -1

        # print(json.loads(list_min[0]))
        # exit()

        # d = {'param' : min_item['time']}
        # result_adv = client.query("select value from motion_since_last_adv where device_id='c098e59000b4' and (gateway_id='c0:98:e5:c0:00:25' or gateway_id='c0:98:e5:c0:00:26' or gateway_id='c0:98:e5:c0:00:03') and time=\'" + str(min_item['time']) + "\'")
        # val_adv = int(list(result_adv.get_points('motion_since_last_adv'))[0]['value'])
        # #print(val_adv)
        # #exit()

        # result_now = client.query("select value from current_motion where device_id='c098e59000b4' and (gateway_id='c0:98:e5:c0:00:25' or gateway_id='c0:98:e5:c0:00:26' or gateway_id='c0:98:e5:c0:00:03') and time=\'" + str(min_item['time']) + "\'")
        # # list_now = list(result_now.get_points('current_motion'))
        # # print(list_now)
        # # exit()
        # val_now = int(list(result_now.get_points('current_motion'))[0]['value'])

        # print(list_min[0])
        # print(int(next(item for item in list_adv if item['time'] == min_item['time'])['value']))
        # exit()


        # for adv_id, adv_item in enumerate(list_adv):
        #     if min_item['device_id'] == adv_item['device_id'] and min_item['time'] == adv_item['time']:
        #         adv_savId = adv_id
        #         break

        # for now_id, now_item in enumerate(list_now):
        #     if min_item['device_id'] == now_item['device_id'] and min_item['time'] == now_item['time']:
        #         now_savId = now_id
        #         break

        adv_savId = binsearch(list_adv, min_item['time'])
        now_savId = binsearch(list_now, min_item['time'])

        if(adv_savId == -1):
            numerrors = numerrors + 1
            print("Error: since last adv data not found")
            continue

        if(now_savId == -1):
            numerrors = numerrors + 1
            print("Error: current data not found")
            continue

        # print(int(list_now[now_savId]['value']))
        # if(list_now[now_savId]['value'] == True):
        #     print("Yes")
        #     exit()

        
        try:
            fout.write(str(min_item['device_id']) + "," + str(min_item['gateway_id'].replace(":","")) + "," + str(int(list_now[now_savId]['value'])) + "," + str(int(list_adv[adv_savId]['value'])) + "," + str(int(min_item['value'])) + "," + str(min_item['time'].split("T")[0]) + " " + str(min_item['time'].split("T")[1].split(".")[0]) + '\n')
            #fout.write(str(min_item['device_id']) + "," + str(min_item['gateway_id'].replace(":","")) + "," + str(int(next(item for item in list_now if item['time'] == min_item['time'])['value'])) + "," + str(int(next(item for item in list_adv if item['time'] == min_item['time'])['value'])) + "," + str(int(min_item['value'])) + "," + str(min_item['time'].split("T")[0]) + " " + str(min_item['time'].split("T")[1].split(".")[0]) + '\n')
            #fout.write(str(min_item['device_id']) + "," + str(min_item['gateway_id'].replace(":","")) + "," + str(val_adv) + "," + str(val_now) + "," + str(int(min_item['value'])) + "," + str(min_item['time'].split("T")[0]) + " " + str(min_item['time'].split("T")[1].split(".")[0]) + '\n')
        except (KeyboardInterrupt, SystemExit):
            raise
        except:
            print("Couldnt find value")
            numerrors = numerrors + 1

    sys.stdout.write('\n')
    sys.stdout.flush()
    errct.append(numerrors)

    fout.close()

print("\nNumber of unfound fields per device:")
for devCt, devItem in enumerate(devices):
    print(str(devCt) + ". " + str(devItem) + ": " + str(errct[devCt]))

print()
print("Total Time:")
printTime(datetime.now() - actStartTime)









