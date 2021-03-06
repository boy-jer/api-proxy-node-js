
var config= null;

var current_driver = null;
var drivers_dir = "./storage-drivers";

module.exports.init = function( _config ) {
    config = _config;
    if (config.simpledb != null && config.memcache_server != null) {
        current_driver = require(drivers_dir +"/simpledb_w_memcached");
        current_driver.init(_config);
    } else
    if (config.simpledb != null ) {
        current_driver = require(drivers_dir +"/simpledb");
        current_driver.init(_config);
    }
    else
    {
        current_driver = require(drivers_dir +"/memcached");
        current_driver.init(_config);
    }
};

// In the get operation, data represents a default value
module.exports.getAppData = function( namespace, application, key, on_ok, on_error, state ) {
    return current_driver.getRawData( namespace , application.app_id + ":" +key, on_ok, on_error, state );
};

module.exports.setAppData = function( namespace, application,  key, data, on_ok, on_error, state ) {
    data.last_updated = new Date();
    return current_driver.setRawData(  namespace , application.app_id + ":" +key, data, on_ok, on_error, state );
};

module.exports.getAppBlob = function( namespace, application, key, on_ok, on_error, state ) {
    return current_driver.getRawBlob( namespace , application.app_id + "/" +key, on_ok, on_error, state );
};

module.exports.setAppBlob = function( namespace, application,  key, data, on_ok, on_error, state ) {
    data.last_updated = new Date();
    return current_driver.setRawBlob(  namespace , application.app_id + "/" +key, data, on_ok, on_error, state );
};

module.exports.getUserData = function( namespace, user, key, on_ok, on_error, state ) {
    return current_driver.getRawData( namespace , user.user_id + ":" + key, on_ok, on_error, state );
};

module.exports.setUserData = function( namespace, user,  key, data, on_ok, on_error, state ) {
	data.user_id = user.user_id;
    data.last_updated = new Date();
    return current_driver.setRawData( namespace , user.user_id + ":" + key, data, on_ok, on_error, state );
};

module.exports.getUserBlob = function( namespace, user, key, on_ok, on_error, state ) {
    return current_driver.getRawBlob( namespace , user.user_id + "/" + key, on_ok, on_error, state );
};

module.exports.setUserBlob = function( namespace, user,  key, data, on_ok, on_error, state ) {
    return current_driver.setRawBlob ( namespace , user.user_id + "/" + key, data, on_ok, on_error, state );
};