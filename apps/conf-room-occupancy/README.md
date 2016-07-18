Conference Room Occupancy
=========================

This app tries to estimate conference room occupancy using PIR motion sensors
and power meters. It can use any number of PIR motion sensors, but at least
one must be watching the room and at least one must be above the door and
only see movement through the door way. It supports any number
of power meters, as long as they measure loads that have the property
that when their wattage is above a certain threshold the room is occupied.

The app is implemented as a state machine with three states:
`OCCUPIED`, `UNOCCUPED`, and `UNSURE`. Any motion or sufficient power draw in the
room puts it in the `OCCUPIED` state. It will only transition to the `UNOCCUPIED`
state if motion is seen near the door. When motion is being detected near the door,
the app will go to `UNSURE` (which should be interpretted as occupied) and then if
nothing further happens in the room it will move to `UNOCCUPIED`. This state machine
is necessary because people regularly sit still enough to not trigger PIR motion
sensors.

Configuration
--------------

The app needs a file named `configuration.json` that looks like:

```
```

Output
------

The app outputs

```
{
  room: <room name from config file>,
  gateway_id: <MAC address of the gateway>,
  occupied: <true|false>,
  confidence: <float. Don't read into this too much>,
  time: <new Date().toISOString()>
}
```

on
