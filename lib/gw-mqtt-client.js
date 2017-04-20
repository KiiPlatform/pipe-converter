var mqtt = require('mqtt');
var util = require('util');
var events = require('events');

// level is error by default
var winston = require('winston');
winston.level = 'error';

function GwMQTTClient (kiiAppID, kiiSite) {
  this._mqttClient = null;
  this._kiiAppID = kiiAppID;
  this._kiiSite = kiiSite;
  this.connected = false;
}

util.inherits(GwMQTTClient, events.EventEmitter);

GwMQTTClient.prototype.connect = function(url, opts){
  this._mqttClient = mqtt.connect(url, opts)

  // listen to events from mqtt
  this._mqttClient.on('connect', this.onConnect.bind(this));
  this._mqttClient.on('close', this.onClose.bind(this));
  this._mqttClient.on('message', this.onMessage.bind(this));
  return this;
}

GwMQTTClient.prototype.onConnect = function(){
  this.connected = true;
  this.emit('connect');
}

GwMQTTClient.prototype.onClose = function(){
  this.connected = false;
  this.emit('close');
}

GwMQTTClient.prototype.onMessage = function(topic, message){
  winston.debug("received topic:"+topic+", message:"+message);
  var ti = topic.split("/");
  if (ti.length < 5 || ti[4] !== "commands") {
    winston.debug("ignore topic:"+ topic);
    return;
  }
  var vendorThingID = ti[3];
  this.emit('commands', vendorThingID, JSON.parse(message));
}

// type can be commands/states/commandResults
GwMQTTClient.prototype._getTopic = function(vendorThingID, type) {
  return this._kiiSite+"/"+this._kiiAppID+"/e/"+vendorThingID+"/"+type;
}

GwMQTTClient.prototype.subscribeCommands = function(vendorThingID, callback){
  if (!this.connected) {
    callback(new Error("mqtt not yet connected"));
  }else{
    this._mqttClient.subscribe(this._getTopic(vendorThingID, 'commands'), function(err, granted){
      callback(err);
    });
  }
}

GwMQTTClient.prototype.updateStates = function(vendorThingID, state, callback){
  if (!this.connected) {
    callback(new Error("mqtt not yet connected"));
  }else{
    this._mqttClient.publish(this._getTopic(vendorThingID, 'states'), JSON.stringify(state), function(err){
      callback(err);
    });
  }
}

GwMQTTClient.prototype.updateCommandResults = function(vendorThingID, commandResults, callback){
  if (!this.connected) {
    callback(new Error("mqtt not yet connected"));
  }else{
    this._mqttClient.publish(this._getTopic(vendorThingID, 'commandResults'), JSON.stringify(commandResults), callback);
  }
}

GwMQTTClient.prototype.updateEndnodeConnection = function(vendorThingID, isConnected, callback){
  if (!this.connected) {
    callback(new Error("mqtt not yet connected"));
  }else{
    var type;
    if (isConnected) {
      type = "connect";
    }else{
      type = "disconnect";
    }
    this._mqttClient.publish(this._getTopic(vendorThingID, type), JSON.stringify({}), function(err){
      callback(err);
    });
  }
}

GwMQTTClient.prototype.setWinston = function(logger) {
  winston = logger;
}

module.exports = function(kiiAppID, kiiSite){
  return new GwMQTTClient(kiiAppID, kiiSite);
}
