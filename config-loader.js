
var fs = require('fs');
var util = require('util');
var owl = require('./owl_util.js');

// CONFIG START
var myarray =
[
];

// Load applications

module.exports.init = function( config ) {
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
	    module.exports.applications[ myarray[i].app_id ].clone = function(){ return owl.util.copy(this,true);};
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



