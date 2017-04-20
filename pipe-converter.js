#!/usr/bin/env node

var Client = require('./lib/gw-mqtt-client.js');

// set log level to see the information
var winston = require('winston');
winston.level = 'debug';
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {'timestamp':true});
// also log to file
winston.add(winston.transports.File, { filename: 'pipe-converter.log', timestamp: true });

var nconf = require('nconf');

// init vars from config.json
nconf.file({ file: 'config.json' });
var appId = nconf.get('kii_app:app_id');
var site = nconf.get('kii_app:site');
var mqttHost = nconf.get('agent:mqtt:host');
var port = parseInt(nconf.get('agent:mqtt:port'));
var converterId = nconf.get('converter_id');
var vid = nconf.get('sensor_id');

var client = null;
var endnodeMap = {};

var clientId = site+"/"+appId+"/c/"+converterId;
options = {
  port: port,
  clientId: clientId,
  keepalive: 600,
  clean:true,
  protocolVersion: 4
}
client = Client(appId, site).connect("tcp://"+mqttHost, options);

// set winston to client
client.setWinston(winston);

client.on('disconnect', function(){
  winston.debug("disconnect from gw agent");
});

client.on('commands', function(vid, commands){
  winston.debug("commands:"+commands.commandID+" for "+vid);

  bleCentral.handleCommands(vid, commands, function(err, commandResults){
    if(err !== null && err !== undefined){
      winston.error("fail to handle commands:"+err);
      return;
    }
    client.updateCommandResults(vid, commandResults, function(err){
      winston.debug("update command results succeeded");
      bleCentral.getStates(vid, function(err, state){
        if (err === null || err === undefined) {
          client.updateStates(vid, state, function(err){
            if (err !== null && err !== undefined){
              winston.error("update state of endnode faild:"+err);
            }else{
              winston.debug("update state of endnode succeeded");
            }
          });
        }else {
          winston.error("get state of endnode failed:"+err);
        }
      });
    });
  });
});

client.on('connect', function(){
  winston.debug('connected to gateway agent');
});

// read sensor data from command line
const childProcess = require('child_process');

// reference: http://www.robotsfx.com/robot/BLECAST_ENV.html
let tempCalculator = function (msb, lsb) {
    return Math.ceil((175.72 * (msb * 256 + lsb)) / 65536 - 46.85);
}

// reference: http://www.robotsfx.com/robot/BLECAST_ENV.html
let humCalculator = function (msb, lsb) {
    return Math.ceil((125 * (msb * 256 + lsb)) / 65536 - 6);
}

// reference: http://www.robotsfx.com/robot/BLECAST_ENV.html
let illCalculator = function (msb, lsb) {
    return msb * 256 + lsb;
}

var lastStatusUpate = null;

setInterval(function(){
    var output = childProcess.spawnSync('bash', ['./readdata.sh']).output;
    var error = output[2];
    var data = output[1];
    if(error.length != 0) {
        winston.error("failed to read sensor data: "+ error);
    }else{
        if(data.length != 0){
            var sensors = data.toString().split(',')
            if(sensors.length != 3) {
                winston.error("invalid raw data: "+ data);
            }else {
                var tempSensor = sensors[0].split('.');
                var humSensor = sensors[1].split('.');
                var illSensor = sensors[2].split('.');
                var temp = tempCalculator(parseInt(tempSensor[0]), parseInt(tempSensor[1]));
                var humidity = humCalculator(parseInt(humSensor[0]), parseInt(humSensor[1]));
                var illumination = illCalculator(parseInt(illSensor[0]), parseInt(illSensor[1]));
                var states = {
                    temperature: temp,
                    humidity: humidity,
                    illumination: illumination
                }

                var now = Date.now();
                if(lastStatusUpate == null || (now - lastStatusUpate )/1000 > 10) {
                    client.updateEndnodeConnection(vid, true, function(err){
                        if (err !== null && err !== undefined){
                            winston.error("report connection of endnode("+ vid+") failed:"+err);
                        }else{
                            winston.debug("report connection of endnode("+ vid+") succeeded.");
                            lastStatusUpate = now;
                        }
                    });
                }
                winston.debug("state of endnode:"+JSON.stringify(states));
                client.updateStates(vid, states, function(err){
                    if (err !== null && err !== undefined){
                    winston.error("update state of endnode faild:"+err);
                    }else{
                    winston.debug("update state of endnode succeeded");
                    }
                });
            }
        }else{
            winston.debug("not sensor data");
            var now = Date.now();
            if (lastStatusUpate != null && (now - lastStatusUpate)/1000 > 10 ) {

                client.updateEndnodeConnection(vid, false, function(err){
                    if (err !== null && err !== undefined){
                        winston.error("report disconnection of endnode("+ vid+") failed:"+err);
                    }else{
                        winston.debug("report disconnection of endnode("+ vid+") succeeded.");
                        lastStatusUpate = now;
                    }
                });
            }
        }
    }
}, 2000);