/* eslint-disable no-await-in-loop */
/* eslint-disable new-cap */
const express = require('express');
const ewelink = require('ewelink-api');

const app = express();

const port = process.env.PORT || 3002;
app.listen(port);
console.log(`Server listening on port ${port}`);

function extract(path, key) {
  const idx = path.indexOf(key);
  if (idx >= 0) {
    let sub = path.substring(idx + key.length);
    const r = sub.indexOf('/');
    if (r > 0)sub = sub.substring(0, r);
    return sub;
  }
  return null;
}

function extractLoginData(path) {
  const Email = extract(path, '/email=');
  const Password = extract(path, '/password=');
  const Region = extract(path, '/region=');
  if (Email && Password && Region) {
    return {
      email: Email,
      password: Password,
      region: Region,
    };
  }
  return null;
}

function removeTags(...args) {
  let res = args[0];
  for (let i = 1; i < args.length; i++) {
    const idx = res.indexOf(args[i]);
    if (idx >= 0) {
      const idx1 = res.indexOf('/', idx + 1);
      res = res.substring(0, idx) + res.substring(0, idx) + (idx1 >= 0 ? res.substring(idx1) : '');
    }
  }
  return res;
}

function getTag(path) {
  let idx = path.indexOf('/', 1);
  if (idx === -1)idx = path.length;
  let eq = path.indexOf('=');
  if (eq === -1 || eq > idx)eq = idx;
  let eq1 = eq + 1;
  if (eq1 > idx)eq1 = idx;
  return [
    path.substring(1, eq),
    path.substring(eq1, idx),
    path.substring(idx),
  ];
}

async function ewconnect(path) {
  const obj = extractLoginData(path);
  if (obj) {
    return new ewelink(obj);
  }
  return null;
}

function deviceInfo(element) {
  const object = {};
  const opt = property => {
    if (Object.prototype.hasOwnProperty.call(element, property)) {
      object[property] = element[property];
    }
  };
  opt('name');
  opt('online');
  opt('deviceid');
  opt('switch');
  opt('currentTemperature');
  opt('currentHumidity');
  return object;
}

app.use(async (req, res, next) => {
  if (req.path.indexOf('/email') >= 0) {
    try {
      const connection = await ewconnect(req.path);
      if (connection) {
        let path = decodeURI(req.path);
        path = removeTags(path, '/email=', '/password=', '/region=');
        let answer = '';
        let deviceid = null;
        let device = null;
        let state = null;
        let key = null;
        let val = null;
        let some = false;
        const accumulate = el => { answer += el; some = true; };
        do {
          [key, val, path] = getTag(path);
          if (key.length) {
            some = false;
            if (key === 'devices') {
              const devices = await connection.getDevices();
              devices.forEach(element => accumulate(JSON.stringify(deviceInfo(element))));
            }
            if (key === 'device') {
              deviceid = val;
              device = await connection.getDevice(deviceid);
              state = deviceInfo(device);
            }
            if (device && deviceid.length) {
              if (key === 'info') accumulate(JSON.stringify(state));
              if ('toggle|on|off|turnoff|turnon'.indexOf(key) >= 0) {
                if (key.indexOf(state.switch) === -1) await connection.toggleDevice(deviceid);
              }
              if (key === 'value') accumulate(state[val]);
            }
            if (!some) accumulate(key);
          }
        } while (path.length > 0);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.write(answer);
        res.end();
      }
    } catch (error) {
      next(error);
    }
  }
  next();
});
