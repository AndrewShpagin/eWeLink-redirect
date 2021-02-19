# eWeLink-redirect
This node allows to get state or send command to any eWeLink device using the simple URL. It allows to operate with devices from everywhere, for example from gs scripts (google sheets).

The links looks like
**your_web_address/email=.../password=.../region=.../option=value/...**

As example you may use 

http://iot-proxy.com/

as the web server where this node is run. I don't guarantee it will work forever there. Better, setup your own node if need.

All options look like
### /option=value
The value is optional and may be missing if it has sense. You may pass multiple options at once and operate with multiple devices. But first 3 options should be **email, password, region**, this is mandatory!
The list of available options:

| Option    |Parameter | Value                                |
| --------- |:--------:|:-------------------------------------|
| /email    | email    | email used for eWeLink registration  |
| /password | password | password used for registration       |
| /region   | code     | registration region us, en, cn       |
| /devices  | none     | returns the list of all devices      |
| /raw      | none     | returns raw info about all devices   |
| /device   | device ID| sets the current device to operate, you should provide device ID as parameter, like **/device=0981567** |
| /on       | none     | switch the device to 'ON' state      |
| /off      | none     | switch the device to 'OFF' state     |
| /toggle   | none     | switch the device state              |
| /value    |identifier|returns the value of the current device state, example **/value=switch**, pissible values - **name, online, switch, deviceid, currentTemperature, currentHumidity, power** |
| /info     | none     | returns the state of the current device as json (see the example below) |

If you will write comething like
**/some_letters_there** and it will not be recognix=zed as some option, then the leters will be passed directly to the output data without any changes.

### Example of the URL:

http://iot-proxy.com/email=validemail@gmail.com/password=validpassword/region=eu/device=1000269525/off/%7B/value=switch/%7D,/info/

it will send you the text
```json
{on},{
	"name": "Фитофильтр",
	"online": true,
	"deviceid": "1000269525",
	"switch": "on"
}
```

