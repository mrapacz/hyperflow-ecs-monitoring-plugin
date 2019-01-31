var net = require('net');
var http = require('http');
var url = require('url');
var prometheus = require('prom-client');
var AWS = require('aws-sdk');
const Influx = require('influxdb-nodejs');

var config = require('./hyperflowMonitoringEcsPlugin.config.js');
var pushGateWay = new prometheus.Pushgateway(config.prometheusPushGateway);
var metrics = {};

var MonitoringEcsPlugin = function () {
};

MonitoringEcsPlugin.prototype.storeEcsData = function () {
    var that = this;
    that.getEcsData();
};


MonitoringEcsPlugin.prototype.writeDataToPrometheus = function (metric, value, labels) {
    metric.set(
        {
            wfId: that.getWfId(),
            hfId: that.getHfId(),
            ...labels
        },
        value
    );
    prometheusPushGateway.push({jobName: 'hyperflow-ecs-monitoring-plugin'}, () => {
    });
};


MonitoringEcsPlugin.prototype.getEcsData = function () {
    that = this;

    var configAws = {
        accessKeyId: config.awsAccessKey,
        secretAccessKey: config.awsSecretAccessKey,
        region: config.awsRegion
    };

    var ecs = new AWS.ECS(configAws);
    var cloudwatch = new AWS.CloudWatch(configAws);

    var dataToStore = {};

    var params = {cluster: config.clusterName};
    ecs.listContainerInstances(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else {
            containerCount = data.containerInstanceArns.length;

            metrics.hyperflow_ecs_monitor_container = metrics.hyperflow_ecs_monitor_container || new prometheus.Gauge(
                {
                    name: 'hyperflow_ecs_monitor_container',
                    help: 'containerCount',
                    labelNames: ['wfId', 'hfId']
                }
            );
            that.writeDataToPrometheus(metrics.hyperflow_ecs_monitor_container, containerCount);
        }
    });

    ecs.listTasks(params, function (err, data) {
        if (err) console.log(err, err.stack);
        else {
            taskCount = data.taskArns.length;

            metrics.hyperflow_ecs_monitor_tasks = metrics.hyperflow_ecs_monitor_tasks || new prometheus.Gauge(
                {
                    name: 'hyperflow_ecs_monitor_tasks',
                    help: 'taskCount',
                    labelNames: ['wfId', 'hfId']
                }
            );
            that.writeDataToPrometheus(metrics.hyperflow_ecs_monitor_tasks, taskCount);
        }
    });

    cloudwatch.waitFor('alarmExists', function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            AlarmLowValue = data.MetricAlarms[0].StateValue;
            AlarmHighValue = data.MetricAlarms[1].StateValue;

            metrics.hyperflow_ecs_monitor_alarms = metrics.hyperflow_ecs_monitor_alarms || new prometheus.Gauge(
                {
                    name: 'hyperflow_ecs_monitor_alarms',
                    help: 'alarms',
                    labelNames: ['wfId', 'hfId', 'alarmLowValue', 'alarmHighValue']
                }
            );

            that.writeDataToPrometheus(metrics.hyperflow_ecs_monitor_alarms, 0, {
                alarmLowValue: AlarmLowValue,
                alarmHighValue: AlarmHighValue
            });
        }
    });

    //cloudwatch.
    var endTime = new Date();
    var startTime = new Date(endTime - 1000000);


    console.log(startTime);
    console.log(endTime);

    var paramsCpuCluster = {
        EndTime: endTime, /* required */
        MetricName: "CPUUtilization", /* required */
        Namespace: "AWS/ECS", /* required */
        Period: 60, /* required */
        StartTime: startTime, /* required */
        Dimensions: [
            {
                "Name": "ClusterName",
                "Value": "ecs_test_cluster_hyperflow"
            }
            /* more items */
        ],

        Statistics: [
            "Average"
        ],
    };


    cloudwatch.getMetricStatistics(paramsCpuCluster, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            var value = data.Datapoints[data.Datapoints.length - 1].Average
            console.log(data.Datapoints[data.Datapoints.length - 1]);

            metrics.hyperflow_cluster_cpu = metrics.hyperflow_cluster_cpu || new prometheus.Gauge(
                {
                    name: 'hyperflow_cluster_cpu',
                    help: 'cpu_percentage',
                    labelNames: ['wfId', 'hfId']
                }
            );

            that.writeDataToPrometheus(metrics.hyperflow_cluster_cpu, value);
        }
    });

    var paramsCpuWorkers = {
        EndTime: endTime, /* required */
        MetricName: "CPUUtilization", /* required */
        Namespace: "AWS/ECS", /* required */
        Period: 60, /* required */
        StartTime: startTime, /* required */
        Dimensions: [
            {
                "Name": "ServiceName",
                "Value": "hyperflow-service-worker"
            },
            {
                "Name": "ClusterName",
                "Value": "ecs_test_cluster_hyperflow"
            }
            /* more items */
        ],

        Statistics: [
            "Average"
        ],
    };


    cloudwatch.getMetricStatistics(paramsCpuWorkers, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            // successful response
            var value = data.Datapoints[data.Datapoints.length - 1].Average
            console.log(data.Datapoints[data.Datapoints.length - 1]);
            metrics.hyperflow_worker_cpu = metrics.hyperflow_worker_cpu || new prometheus.Gauge(
                {
                    name: 'hyperflow_worker_cpu',
                    help: 'cpu_percentage',
                    labelNames: ['wfId', 'hfId']
                }
            );

            that.writeDataToPrometheus(metrics.hyperflow_worker_cpu, value);
        }
    });


    var paramsCpuMaster = {
        EndTime: endTime, /* required */
        MetricName: "CPUUtilization", /* required */
        Namespace: "AWS/ECS", /* required */
        Period: 60, /* required */
        StartTime: startTime, /* required */
        Dimensions: [
            {
                "Name": "ServiceName",
                "Value": "hyperflow-service-master"
            },
            {
                "Name": "ClusterName",
                "Value": "ecs_test_cluster_hyperflow"
            }
            /* more items */
        ],

        Statistics: [
            "Average"
        ],
    };


    cloudwatch.getMetricStatistics(paramsCpuMaster, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            // successful response
            var value = data.Datapoints[data.Datapoints.length - 1].Average
            //var time =  new Date(data.Datapoints[data.Datapoints.length-1].Timestamp)
            console.log(data.Datapoints[data.Datapoints.length - 1]);
            metrics.hyperflow_master_cpu = metrics.hyperflow_master_cpu || new prometheus.Gauge(
                {
                    name: 'hyperflow_master_cpu',
                    help: 'cpu_percentage',
                    labelNames: ['wfId', 'hfId']
                }
            );

            that.writeDataToPrometheus(metrics.hyperflow_master_cpu, value);
        }
    });

///////////////////////////////////////////////////////////////
    var paramsCpuCluster = {
        EndTime: endTime, /* required */
        MetricName: "MemoryUtilization", /* required */
        Namespace: "AWS/ECS", /* required */
        Period: 60, /* required */
        StartTime: startTime, /* required */
        Dimensions: [
            {
                "Name": "ClusterName",
                "Value": "ecs_test_cluster_hyperflow"
            }
            /* more items */
        ],

        Statistics: [
            "Average"
        ],
    };


    cloudwatch.getMetricStatistics(paramsCpuCluster, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            var value = data.Datapoints[data.Datapoints.length - 1].Average
            console.log(data.Datapoints[data.Datapoints.length - 1]);
            metrics.hyperflow_cluster_memory = metrics.hyperflow_cluster_memory || new prometheus.Gauge(
                {
                    name: 'hyperflow_cluster_memory',
                    help: 'cluster_mem_percentage',
                    labelNames: ['wfId', 'hfId']
                }
            );

            that.writeDataToPrometheus(metrics.hyperflow_cluster_memory, value);
        }
    });

    var paramsCpuWorkers = {
        EndTime: endTime, /* required */
        MetricName: "MemoryUtilization", /* required */
        Namespace: "AWS/ECS", /* required */
        Period: 60, /* required */
        StartTime: startTime, /* required */
        Dimensions: [
            {
                "Name": "ServiceName",
                "Value": "hyperflow-service-worker"
            },
            {
                "Name": "ClusterName",
                "Value": "ecs_test_cluster_hyperflow"
            }
            /* more items */
        ],

        Statistics: [
            "Average"
        ],
    };


    cloudwatch.getMetricStatistics(paramsCpuWorkers, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            // successful response
            var value = data.Datapoints[data.Datapoints.length - 1].Average
            console.log(data.Datapoints[data.Datapoints.length - 1]);
            metrics.hyperflow_worker_memory = metrics.hyperflow_worker_memory || new prometheus.Gauge(
                {
                    name: 'hyperflow_worker_memory',
                    help: 'worker_mem_percentage',
                    labelNames: ['wfId', 'hfId']
                }
            );

            that.writeDataToPrometheus(metrics.hyperflow_worker_memory, value);
        }
    });


    var paramsCpuMaster = {
        EndTime: endTime, /* required */
        MetricName: "MemoryUtilization", /* required */
        Namespace: "AWS/ECS", /* required */
        Period: 60, /* required */
        StartTime: startTime, /* required */
        Dimensions: [
            {
                "Name": "ServiceName",
                "Value": "hyperflow-service-master"
            },
            {
                "Name": "ClusterName",
                "Value": "ecs_test_cluster_hyperflow"
            }
            /* more items */
        ],

        Statistics: [
            "Average"
        ],
    };


    cloudwatch.getMetricStatistics(paramsCpuMaster, function (err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            // successful response
            var value = data.Datapoints[data.Datapoints.length - 1].Average
            //var time =  new Date(data.Datapoints[data.Datapoints.length-1].Timestamp)
            console.log(data.Datapoints[data.Datapoints.length - 1]);
            metrics.hyperflow_master_memory = metrics.hyperflow_master_memory || new prometheus.Gauge(
                {
                    name: 'hyperflow_master_memory',
                    help: 'master_mem_percentage',
                    labelNames: ['wfId', 'hfId']
                }
            );

            that.writeDataToPrometheus(metrics.hyperflow_master_memory, value);
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