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



// MonitoringEcsPlugin.prototype.sendMetrics = function () {
//     var that = this;
//     //TODO: Create connection once and then try to reuse it
//     var parts = config.metricCollector.split(':');
//     var host = parts[0];
//     var port = 9002;
//     if (parts.length > 1) {
//         port = parseInt(parts[1]);
//     }

//     //TODO: change to waterfall
//     that.getConsumersCount(function (err, consumersCount) {
//         var timestamp = parseInt(Date.now() / 1000);

//         var consumers = -1;
//         if (!err && consumersCount != undefined) {
//             consumers = consumersCount;
//         } else {
//             //probabbly rabbit is down, silently ignore
//             //console.log(err);
//         }

//         var tasksLeft = that.getTasksLeft();
//         var outputsLeft = that.getOutputsLeft();
//         var tasksProcessed = that.getTasksProcessed();
//         var tasks = that.getTasks();
//         var stage = that.getStage();
//         var wfid = that.getWfId();
//         var hfId = that.getHfId();

//         console.log("config %j",config);

//         if (config.metricCollectorType == 'visor') {
//             var client = net.createConnection({host: host, port: port}, function () {

//                 var tasksLeftText = config.serverName + '.nTasksLeft ' + tasksLeft + ' ' + timestamp + '\r\n';
//                 var outputsLeftText = config.serverName + '.nOutputsLeft ' + outputsLeft + ' ' + timestamp + '\r\n';
//                 var tasksProcessedText = config.serverName + '.nTasksProcessed ' + tasksProcessed + ' ' + timestamp + '\r\n';
//                 var tasksText = config.serverName + '.nTasks ' + tasks + ' ' + timestamp + '\r\n';
//                 var stageText = config.serverName + '.stage ' + stage + ' ' + timestamp + '\r\n';
//                 var consumersText = config.serverName + '.nConsumers ' + consumers + ' ' + timestamp + '\r\n';

//                 client.write(tasksLeftText);
//                 client.write(outputsLeftText);
//                 client.write(tasksProcessedText);
//                 client.write(tasksText);
//                 client.write(stageText);
//                 client.write(consumersText);
//                 client.end();
//             });
//             client.on('error', function () {
//                 console.log('Monitoring plugin is unable to connect to: ' + config.metricCollector);
//             });
//         } else if (config.metricCollectorType == 'influxdb') {
//             var metrics = {
//                 'tasksLeft': tasksLeft,
//                 'outputsLeft': outputsLeft,
//                 'tasksProcessed': tasksProcessed,
//                 'tasks': tasks,
//                 'stage': stage,
//                 'consumersCount': consumers,
//                 'wfid' : wfid,
//                 'hfid' : '"'+hfId+'"'
//             };
//             that.writeToInfluxDB(metrics, function (err) {
//                 if (err) {
//                     console.log("error writting to influxdb!");
//                     console.log(err);
//                 }
//             });
//         } else {
//             console.log('Monitoring plugin is unable to write to unknown metric collector type: ' + config.metricCollectorType);
//         }
//     });
// };

// MonitoringEcsPlugin.prototype.getStage = function () {
//     var level = 0;
//     this.engine.tasks.forEach(function (task) {
//         if (task.logic.firingId != 0) {
//             var taskLevel = task.logic.fullInfo.level;
//             if (taskLevel !== undefined) {
//                 if (level < taskLevel) {
//                     level = taskLevel;
//                 }
//             }
//         }
//     });
//     return level;
// };

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

// MonitoringEcsPlugin.prototype.writeToInfluxDB = function (metrics, cb) {
//     var influxdbUrl = url.parse(config.metricCollector);
//     var data = 'hyperflow ';
//     var metric_items = [];
//     for (field in metrics) {
//         if (metrics.hasOwnProperty(field)) {
//             metric_items.push(field + '=' + metrics[field]);
//         }
//     }

//     data += metric_items.join(',');

//     console.log("data %j",data);

//     request = http.request({
//         hostname: influxdbUrl.hostname,
//         port: influxdbUrl.port,
//         path: influxdbUrl.path,
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/x-www-form-urlencoded',
//             'Content-Length': data.length
//         }
//     }, function (res) {
//         res.on('data', function () {
//         }).on('end', function () {
//             cb(null);
//         }).on('error', function (err) {
//             cb(new Error('Error, response of the server was: ' + err));
//         });
//         if (res.statusCode != 204) {
//             cb(new Error('Error, response of the server was: ' + res.statusCode + ' ' + res.statusMessage));
//             return;
//         }
//     });
//     request.on('error', function (e) {
//         cb(e);
//     });
//     request.write(data);
//     request.end();
    
// };

// MonitoringEcsPlugin.prototype.getConsumersCount = function (cb) {
//     //query rabbitmq for consumers no. on hyperflow.jobs, return null if anything goes wrong

//     var amqpUrl = url.parse(config.amqpURL);
//     var user = config.rabbitmqUser;
//     var password = config.rabbitmqPassword;

//     var options = {
//         method: 'GET',
//         hostname: amqpUrl.hostname,
//         port: 15672,
//         path: '/api/queues',
//         auth: user + ':' + password
//     };

//     var request = http.request(options, function (res) {
//         var data = '';
//         res.on('data', function (chunk) {
//             data += chunk;
//         }).on('end', function () {
//             var consumers = null;
//             var queues = JSON.parse(data);
//             queues.forEach(function (queue) {
//                 if (queue.name == 'hyperflow.jobs') {
//                     consumers = queue.consumers;
//                 }
//             });
//             if (consumers !== null) {
//                 cb(null, consumers);
//             } else {
//                 cb(new Error('no consumer data for hyperflow.jobs'));
//             }
//         }).on('error', function (e) {
//             cb(e);
//         });
//     }).on('error', function (e) {
//         cb(e);
//     });
//     request.end();
// };

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