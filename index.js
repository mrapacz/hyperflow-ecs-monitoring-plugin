var net = require('net');
var http = require('http');
var url = require('url');

var AWS = require('aws-sdk');
const Influx = require('influxdb-nodejs');

var config = require('./hyperflowMonitoringEcsPlugin.config.js');

var MonitoringEcsPlugin = function () {
};

MonitoringEcsPlugin.prototype.storeEcsData = function()
{
    var that = this;
    that.getEcsData();
}

function CDL(countdown, completion) {
    this.signal = function() { 
        if(--countdown < 1) completion(); 
    };
}

MonitoringEcsPlugin.prototype.sendDataToDatabase=function(data)
{
    console.log("json %j",data);
    
    const client = new Influx(config.metricCollector);

    data["wfid"] = that.getWfId();
    data["hfId"] = that.getHfId();

    client.write('hyperflow_ecs_monitor')
    .field(data)
    .then(() => console.info('write point success'))
    .catch(console.error);
}

MonitoringEcsPlugin.prototype.getEcsData = function()
{
    that = this;

    var configAws={accessKeyId: config.awsAccessKey, secretAccessKey: config.awsSecretAccessKey,region: config.awsRegion};

    var ecs = new AWS.ECS(configAws);
    var dataToStore ={};
    
    var latch = new CDL(2, function() {
        that.sendDataToDatabase(dataToStore)
    });
    var params = {cluster:config.clusterName};
    ecs.listContainerInstances(params, function(err, data) {
        if (err) console.log(err, err.stack);
        else
        {
          containerCount=data.containerInstanceArns.length;
          dataToStore["containerCount"] = containerCount;
          console.log("containe instances %d",dataToStore["containerCount"]);
          latch.signal();
        }
    });

    ecs.listTasks(params, function(err, data) {
        if (err) console.log(err, err.stack); 
        else{
          taskCount=data.taskArns.length;
          dataToStore["taskCount"]=taskCount;
          latch.signal();
          console.log("taskCount %d",dataToStore["taskCount"]);
        }
    });
}


MonitoringEcsPlugin.prototype.getWfId = function () {
    return this.engine.wfId;
};

MonitoringEcsPlugin.prototype.getHfId = function () {
    return this.wflib.hfid;
};

MonitoringEcsPlugin.prototype.getTasksLeft = function () {
    return this.engine.nTasksLeft;
};

MonitoringEcsPlugin.prototype.getOutputsLeft = function () {
    return this.engine.nWfOutsLeft;
};

MonitoringEcsPlugin.prototype.getTasksProcessed = function () {
    return this.engine.trace.split(',').length;
};

MonitoringEcsPlugin.prototype.getTasks = function () {
    return this.engine.tasks.length;
};

MonitoringEcsPlugin.prototype.init = function (rcl, wflib, engine) {
    if (this.hasOwnProperty('initialized') && this.initialized === true) {
        return;
    }
    this.rcl = rcl;
    this.wflib = wflib;
    this.engine = engine;

    var that = this;
    setInterval(function () {
        that.storeEcsData();
    }, 1000);

    this.initialized = true;
};

module.exports = MonitoringEcsPlugin;