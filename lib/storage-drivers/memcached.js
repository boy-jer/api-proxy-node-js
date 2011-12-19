
var nMemcached = require('memcached');

var config = null;
module.exports.init = function( _config ) {
    config = _config;
};

module.exports.getRawData = function( namespace, key, on_ok, on_error) {
    var m_conn = new nMemcached(config.memcache_server + ":" + config.memcache_port);
    m_conn.get(config.memcachePrefix + namespace + key, function (err, result) {
        if (err || result == 0) {
             on_error( err );
        }
        else {
            on_ok( JSON.parse( result ) );
            //if ( refresh == true ) {
            //    setRawData(namespace , key, result, function(a){}, function(b){});
            //}
        }
    });
}

module.exports.setRawData = function (namespace,  key, data, on_ok, on_error ) {
    var m_conn = new nMemcached(config.memcache_server + ":" + config.memcache_port);
    m_conn.set(config.memcachePrefix + namespace + key, JSON.stringify(data), config.memcache_memorize_time, function (err) {
        if (err) {
            if (debug) console.log("MEMCACHE ERROR DURING SET");
        }
    });
}