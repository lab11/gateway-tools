PIR -> Occupancy
=================

Detect occupancy in a room based on any motion from and PIR (Blink) sensors.



configuration.json
------------------

```json
{
	"devices": [
		'<Blink device id, no :>',
		'<Blink device id, no :>',
		'<Blink device id, no :>'
	],
	"room": "<room name>"
}


Output
-------


Publishes:

```json
{"room":"<room name>","occupied":true|false,"time":"2016-06-13T05:21:45.750Z"}
```

to MQTT topic:

    occupancy/<room name>
