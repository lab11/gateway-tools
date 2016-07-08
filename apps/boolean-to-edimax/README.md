Boolean -> Edimax
=================

Read a truthy value from an MQTT stream and use that to control Edimax power plugs.


configuration.json
------------------

```
{
	"mqttBroker": "mqtt://custom.com" /* default mqtt://localhost",
	"controlTopic": "occupancy/4908",
	"controlKey": "occupied",
	"controlInvert": true, /* default false */
	"edimaxes": [
		{"name": "Plug4a962b", host: "141.212.11.200"},
		{"name": "Plug4a9639", "password": "CustomPassword", host: "141.212.11.223"}
	]
}