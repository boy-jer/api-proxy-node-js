var config = require('./proxy-config');
//var config_loader = require('./config-loader');
var http = require('http');
var https = require('https');

var main = require('./lib/main');
var debug = config.debug;

var server = http.createServer(main.server);
server.listen( process.env.port || config.server_port);

