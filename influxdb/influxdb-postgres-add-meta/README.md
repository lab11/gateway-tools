InfluxDB Meta Info Middlebox
============================

This script is a web server that can receive `/write` API requests that
are destined for InfluxDB and add more tags before forwarding the message
on to InfluxDB.

This is useful for appending meta information that is centralized and that
each publisher doesn't have.

The metadata is stored in a postgres table created by:

```
CREATE TABLE devices (
    sensorid character varying(128) NOT NULL PRIMARY KEY,
    type text,
    location_general text,
    location_specific text,
    description text,
    details text
);
```

Configuration
-------------

`/etc/swarm-gateway/influxdb-postgres-meta.conf`

```
host = <host of influx db>
port = <influx db port>
protocol = <http|https>

listen_port = <port to run webserver on>

postgres_host =
postgres_port =
postgres_db =
postgres_user =
postgres_password =
```
