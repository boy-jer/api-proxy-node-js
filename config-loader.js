
var fs = require('fs');
var util = require('util');
var http = require('http');
var owl = require('./owl_util.js');
var qs = require('querystring');

// CONFIG START
var myarray =
[
];

var mxmApi = new (require('./lib/simplifiedRequest'))
	.simplifiedRequest( "http://api.musixmatch.com/ws/1.1/");

// Load applications
module.exports.init = function( config ) {
	
    // Set log level;
    var Log = require('log')
      , log = config.debug ? new Log('debug') : new Log('info');
    GLOBAL.MXMLogger = log;

    GLOBAL.MXMLogger.internalLog = log.log;
    GLOBAL.MXMLogger.log = function(levelStr, args) {
        for (var i in args) {
            if (typeof(args[i])!="string" )
            {
                args[i] = util.inspect( args[i] );
            }
        }
        this.internalLog(levelStr, args);
    };
	
    files = fs.readdirSync("./applications");
    for ( file_index in files ) {
	    var module_filename = files[file_index];
	    MXMLogger.notice("Loading module from file " + module_filename);
	    var module_filename = require( "./applications/" + module_filename );
	    myarray = myarray.concat(  module_filename.applications );
    }

    module.exports.applications = { };
    for ( i = 0; i<myarray.length; i++) 
    {
	    module.exports.applications[ myarray[i].app_id ] = myarray[i];
	    module.exports.applications[ myarray[i].app_id ].clone = function() { return owl.util.copy(this,true);};
	    module.exports.applications[ myarray[i].app_id ].call = function(method, params, on_ok, on_error, state) {
	    	var tmpparams = JSON.parse(JSON.stringify(params));
	    	tmpparams["apikey"] = this.apikey;
	    	return mxmApi.get( method, tmpparams, on_ok, on_error, state );
	    }
	    //TODO: this should be different based on store, config and country
	    module.exports.applications[ myarray[i].app_id ].createTrackingUrl =function(store,country, myurl ) {
	    	return  "http://clk.tradedoubler.com/click?p=24373&a=1805894&g=0&" + qs.stringify( {url: myurl });
	    };

    }
    MXMLogger.notice( module.exports.applications );

    // Load routes
    myarray = { };
    files = fs.readdirSync("./routes");
    for ( file_index in files ) {
	    var module_filename = files[file_index];
	     MXMLogger.notice("Loading module from file " + module_filename);
	    var module_filename = require( "./routes/" + module_filename );
        module_filename.init(config);
        for( $k in module_filename.routes)
            myarray[$k] = module_filename.routes[$k];
    }
    module.exports.routes = myarray;
    MXMLogger.notice("Available routes:");
    MXMLogger.notice( module.exports.routes );
        
};


