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

Nginx Setup
-----------

The influx database server has to be able to accept requests that get routed
through this web service before being sent on to the real influx db service.

Here is an example for nginx:

```
upstream influxdb {
	server 127.0.0.1:7770;
}

upstream influxdbmeta {
	server 127.0.0.1:7775;
}

server {

	server_name influx.linklab.virginia.edu;

	access_log /var/log/nginx/influx.access.log;
	error_log /var/log/nginx/influx.error.log;

	location /gateway/write {
		proxy_set_header        Host $http_host;
		proxy_set_header        X-Real-IP $remote_addr;
		proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header        X-Forwarded-Proto $scheme;
		proxy_set_header        Authorization $http_authorization;

		client_max_body_size    10m;
		client_body_buffer_size 128k;
		proxy_connect_timeout   86400s;
		proxy_send_timeout      86400s;
		proxy_read_timeout      86400s;
		proxy_buffering         off;
		proxy_temp_file_write_size 64k;
		proxy_pass              http://influxdbmeta;
		proxy_redirect          off;
		proxy_pass_header       Authorization;
	}

	location / {
		proxy_set_header        Host $http_host;
		proxy_set_header        X-Real-IP $remote_addr;
		proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header        X-Forwarded-Proto $scheme;
		proxy_set_header        Authorization $http_authorization;

		client_max_body_size    10m;
		client_body_buffer_size 128k;
		proxy_connect_timeout   86400s;
		proxy_send_timeout      86400s;
		proxy_read_timeout      86400s;
		proxy_buffering         off;
		proxy_temp_file_write_size 64k;
		proxy_pass              http://influxdb;
		proxy_redirect          off;
		proxy_pass_header       Authorization;
	}


    listen [::]:443 ssl; # managed by Certbot
    listen 443 ssl; # managed by Certbot
}

```
