Boolean -> Edimax
=================

Read a truthy value from an MQTT stream and use that to control Edimax power plugs.


configuration.json
------------------

```javascript
{
	"mqttBroker": "mqtt://custom.com", /* default mqtt://localhost" */
	"controlTopic": "occupancy/4908",
	"controlKey": "occupied",
	"controlInvert": true, /* default false */
	"coalesceEvents": false, /* default true, only send edimax packets if
	                            the new event is different than the last */
	"edimaxes": [
		{"name": "Plug4a962b", host: "141.212.11.200"},
		{"name": "Plug4a9639", "password": "CustomPassword", host: "141.212.11.223"}
	]
}
