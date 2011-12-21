var cluster = require('cluster');
var config = require('./proxy-config');
//var config_loader = require('./config-loader');
var http = require('http');
var https = require('https');

var main = require('./lib/main');
var debug = config.debug;

var numCPUs = 16;
if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster.on('death', function (worker) {
        console.log('worker ' + worker.pid + ' died, resuming a new one');
        cluster.fork();
    });
}
else {
    // Worker processes have a http server.
    var server = http.createServer(main.server);
    server.listen(config.server_port);
}