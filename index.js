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

MonitoringEcsPlugin.prototype.writeDataToDatabase=function(metric, data)
{
    //console.log("json %s %j",metric,data);
    const client = new Influx(config.metricCollector);

    data["wfid"] = that.getWfId();
    data["hfId"] = that.getHfId();

    client.write(metric)
    .field(data)
    .then(() => true)
    .catch(console.error);
}


MonitoringEcsPlugin.prototype.getEcsData = function()
{
    that = this;

    var configAws={accessKeyId: config.awsAccessKey, secretAccessKey: config.awsSecretAccessKey,region: config.awsRegion};

    var ecs = new AWS.ECS(configAws);
    var cloudwatch = new AWS.CloudWatch(configAws);

    var dataToStore ={};
    
    var params = {cluster:config.clusterName};
    ecs.listContainerInstances(params, function(err, data) {
        if (err) console.log(err, err.stack);
        else
        {
          containerCount=data.containerInstanceArns.length;

          that.writeDataToDatabase("hyperflow_ecs_monitor_container",{containerInstanceCount:containerCount})
        }
    });

    ecs.listTasks(params, function(err, data) {
        if (err) console.log(err, err.stack); 
        else{
           taskCount=data.taskArns.length;

          that.writeDataToDatabase("hyperflow_ecs_monitor_tasks",{tasksCount: taskCount})
        }
    });

    cloudwatch.waitFor('alarmExists', function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else{
          AlarmLowValue = data.MetricAlarms[0].StateValue;
          AlarmHightValue = data.MetricAlarms[1].StateValue;
          that.writeDataToDatabase("hyperflow_ecs_monitor_alarms",{alarmLowValue: AlarmLowValue, alarmHightValue:AlarmHightValue});
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