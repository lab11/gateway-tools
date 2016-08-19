InfluxDB Query Example
======================

##Requirements:

Install libraries

    $ sudo pip3 install influxdb configparser

Create influxdb config file. Create `influxdb.conf` and add:

    host = <host of influxdb server>
    port = <port of influxdb server>
    database = <database to write data to>
    protocol = <http|https>
    username = <username to authenticate with>
    password = <password to authenticate with>
    prefix = <path to prepend to `write` API requests>

Example:

    # /etc/swarm-gateway/influxdb.conf
    host = https://influxdb.umich.edu
    port = 8086
    protocol = http
    database = mydata
    username = user
    password = secure
    prefix = gateway/

For umich users, the config can be linked from shed

    ln -s ~/shed/projects/gateway/influxdb.conf .


##Running:

    python3 query_example.py

Returns a ResultSet of 8 items.

