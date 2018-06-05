# Hyperflow monitoring plugin

## Description
This is a simple monitoring plugin for HyperFlow (https://github.com/dice-cyfronet/hyperflow/tree/develop <- 
you need this branch).

### install this plugin
* Clone hyperflow-ecs-monitoring-plugin in $HOME
* npm install
* make a symbolic link to `hyperflow-ecs-monitoring-plugin` directory in $HOME/node_modules/ (this is the preferred way for
development)

### check configuration

The plugin requires a proper config, it needs to know where to find a metric collector and a rabbitmq-server. All values
 can be set by environment variables. RabbitMQ needs to have rest interface enabled.

### start workflow
In HyperFlow directory:
`./bin/hflow run examples/Montage143/workflow.json -s -p hyperflow-ecs-monitoring-plugin`
and observe the message flow in nc.
