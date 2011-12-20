util = require("util");

var config= null;
module.exports.init = function( _config ) {
    config = _config;
};

module.exports.routes =
{
    "/ws/1.1/userdata.get":  function (request, response, application, urlObj, queryObj, call_usertoken) {
        storage.getAppData( "tokens", application, call_usertoken, 
            function(data,state) {
               
            },
            function(err,state) {

            });
    },
    "/ws/1.1/userdata.post":  function (request, response, application, urlObj, queryObj, call_usertoken) {
        
        storage.getAppData( "tokens", application, call_usertoken, 
            function(data,state) {

            },
            function(err,state) {

            });
    }
};