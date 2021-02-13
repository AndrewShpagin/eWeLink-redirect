const express = require('express');
const ewelink = require('ewelink-api');

const app = express();

const port = process.env.PORT || 3002;
const server = app.listen(port);
console.log(`Server listening on port ${port}`);

function extract(path, key){
  const idx = path.indexOf(key);
  if(idx>=0){
    let sub = path.substring(idx + key.length);
    const r = sub.indexOf('/');
    if(r>0)sub = sub.substring(0, r);
    return sub;
  }
  return null;
}

function extractLoginData(path){
  const _email=extract(path,'/email=');
  const _password=extract(path,'/password=');
  const _region=extract(path,'/region=');
  if(_email && _password && _region){
    return {
      email: _email,
      password: _password,
      region: _region,
    }
  }
  return null;
}

function removeTags(){
  var res = arguments[0];
  for (var i = 1; i < arguments.length; i++) {
    const idx = res.indexOf(arguments[i]);
    if (idx >= 0){
      const idx1 = res.indexOf('/', idx + 1);
      res = res.substring(0, idx) + res.substring(0, idx) + (idx1 >= 0 ? res.substring(idx1) : '');
    }
  }
  return res;
}

function getTag(path){
  var idx = path.indexOf('/', 1);
  if(idx === -1)idx=path.length;
  var eq = path.indexOf('=');
  if(eq === -1 || eq > idx)eq=idx;
  var eq1= eq+1;
  if(eq1 > idx)eq1=idx;
  return [ 
    path.substring(1, eq),
    path.substring(eq1, idx),
    path.substring(idx)
  ];
}

async function ewconnect(path) {
  const obj = extractLoginData(path);
  if(obj){
    return new ewelink(obj);
  }
  return null;
}

function deviceInfo(element){
  const object={};
  if(element.hasOwnProperty('deviceid')) {
    object.name = element.name;
    object.online = element.online;
    object.deviceid = element.deviceid;
    if(element.params.hasOwnProperty('currentTemperature'))object.currentTemperature =  element.params.currentTemperature;  
    if(element.params.hasOwnProperty('currentHumidity'))object.switch = element.params.currentHumidity; 
    if(element.params.hasOwnProperty('switch'))object.switch = element.params.switch; 
  }
  return object;
}

app.use( async (req, res, next) => {
  if(req.path.indexOf('/email') >=0 ) {
    try{
      const connection = await ewconnect(req.path);
      if(connection) {
        var path = decodeURI(req.path);
        path = removeTags(path, '/email=', '/password=', '/region=');
        var answer='';
        var devid='';
        var device = null;
        var state = null;
        do{
          var [key, val, path] = getTag(path);
          if(key.length) {
            var some = false;
            if(key == 'devices') {
              const devices = await connection.getDevices();        
              for(const element of devices) {
                const res = deviceInfo(devices, element.deviceid);
                answer += JSON.stringify(res);
                some = true;
              }
            }
            if(key === 'device') {
              devid = val;
              device = await connection.getDevice(devid);
              state = deviceInfo(device);
              some = true;
            }
            if(device) {
              if(key === 'info') {
                answer += JSON.stringify(state);
                some = true;
              }
              if('toggle|on|off|turnoff|turnon'.indexOf(key) >=0) {
                some = true;
                if(key.indexOf(state.switch) === -1) {
                  await connection.toggleDevice(devid);
                }
              }         
              if(key === 'value') {
                some = true;
                answer+=state[val];
              }
            }    
            if(!some){
              answer+=key;
            }        
          }
        } while(path.length > 0);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.write(answer);
        res.end();
      }
    } catch (error) {
      next(error);
    }
  }
  next();
});