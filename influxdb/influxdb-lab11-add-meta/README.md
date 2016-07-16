InfluxDB Meta Info Middlebox
============================

This script is a web server that can receive `/write` API requests that
are destined for InfluxDB and add more tags before forwarding the message
on to InfluxDB.

This is useful for appending meta information that is centralized and that
each publisher doesn't have.

Configuration
-------------

`/etc/swarm-gateway/influxdb-lab11-meta.conf`

```
host = <host of influx db>
port = <influx db port>
protocol = <http|https>

listen_port = <port to run webserver on>

wiki_url = <base url of wiki>
wiki_username = <username>
wiki_password = <password>
```
