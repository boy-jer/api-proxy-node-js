var config = null;

var simpledb = null;
var memcached = null;

module.exports.init = function( _config ) {
    config = _config;

    simpledb = require("./simpledb");
    simpledb.init( _config );

    memcached = require("./memcached");
    memcached.init( _config );
};

module.exports.getRawData = function( namespace, key, on_ok, on_error, state) {
	memcached.getRawData( namespace,key,on_ok,function(err,state) {
			simpledb.getRawData(namespace, key, function(data,state) {
					on_ok(data,state);
					memcached.setRawData(namespace,  key, data, null, null, state);
			}, on_error, state);
	});
};

module.exports.setRawData = function (namespace,  key, data, on_ok, on_error, state ) {
	simpledb.setRawData(namespace,key,data,function(res,state){ 
		memcached.setRawData(namespace,  key, data, on_ok, on_error, state);
	}, on_error,state);
};

//TODO: add the handling of memcached
module.exports.getRawBlob = function ( namespace, key, on_ok, on_error, state) {
	memcached.getRawBlob( namespace,key,on_ok,function(err,state) {
		simpledb.getRawBlob(namespace, key, function(data,state) {
				on_ok(data,state);
				memcached.setRawBlob(namespace,  key, data, null, null, state);
		}, on_error, state);
});
}

module.exports.setRawBlob = function (namespace,  key, data, on_ok, on_error, state ) {
	simpledb.setRawBlob(namespace,key,data,function(res,state){ 
		memcached.setRawBlob(namespace,  key, data, on_ok, on_error, state);
	}, on_error,state);
}

