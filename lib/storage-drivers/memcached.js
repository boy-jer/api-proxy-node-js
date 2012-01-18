
var nMemcached = require('memcached');

var config = null;
module.exports.init = function( _config ) {
    config = _config;
};

module.exports.getRawData = function( namespace, key, on_ok, on_error, state) {
    var m_conn = new nMemcached(config.memcache_server + ":" + config.memcache_port);
    m_conn.get(config.memcachePrefix + namespace + key, function (err, result) {
        if (err || result == 0) {
            if (on_error)
                on_error( err, state );
        }
        else {
            if (on_ok)
                on_ok( JSON.parse( result ),state );
            //if ( refresh == true ) {
            //    setRawData(namespace , key, result, function(a){}, function(b){});
            //}
        }
    });
};

module.exports.setRawData = function (namespace,  key, data, on_ok, on_error, state ) {
    var m_conn = new nMemcached(config.memcache_server + ":" + config.memcache_port);
    m_conn.set(config.memcachePrefix + namespace + key, JSON.stringify(data), config.memcache_memorize_time, function (err) {
        if (err) {
            if (on_error)
                on_error(err,state);
        } else {
            if (on_ok)
                on_ok(data,state);
        }
    });
};

module.exports.getRawBlob = function ( namespace, key, on_ok, on_error, state) {
    var m_conn = new nMemcached(config.memcache_server + ":" + config.memcache_port);
    m_conn.get(config.memcachePrefix + "blob" + namespace + key, function (err, result) {
        if (err || result == 0) {
            if (on_error)
                on_error( err, state );
        }
        else {
            if (on_ok)
                on_ok( result,state );
        }
    });
}

module.exports.setRawBlob = function (namespace,  key, data, on_ok, on_error, state ) {
	//TODO the following code can not work unless we change the binary to an hex string...
	if (on_ok)
		on_ok(data,state);
	return ;
	/*
    var m_conn = new nMemcached(config.memcache_server + ":" + config.memcache_port);
    m_conn.set(config.memcachePrefix + "blob" + namespace + key, data, config.memcache_memorize_time, function (err) {
        if (err) {
            if (on_error)
                on_error(err,state);
        } else {
            if (on_ok)
                on_ok(data,state);
        }
    });
    */
}


