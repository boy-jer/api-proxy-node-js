util = require("util");
storage = require( "../lib/storage" );

var config= null;
module.exports.init = function( _config ) {
    config = _config;
};


module.exports.routes =
{
    "/ws/1.1/userdata.get":  function (request, response, application, urlObj, queryObj, call_usertoken) {
        storage.getAppData( "tokens", application, call_usertoken, 
            function(data,state) {
                var account = data.accounts[0];
                storage.getUserData( "uns_" + queryObj["namespace"], account, queryObj["userdata_id"],
                    function(data,obj) {
                        response.sendPacket( { userdata: data } );
                    },
                    function(err,obj) {
                        response.sendErrorPacket( 404, "" );
                    });;
            },
            function(err,state) {
                response.sendErrorPacket( 401, "renew" );
            });
    },
    "/ws/1.1/userdata.post":  function (request, response, application, urlObj, queryObj, call_usertoken) { 
        storage.getAppData( "tokens", application, call_usertoken, 
            function(data,state) {
                var account = data.accounts[0]; 
                storage.setUserData( "uns_" + queryObj["namespace"], account, queryObj["userdata_id"], queryObj, 
                    function(data,obj) {
                        response.sendPacket( { userdata: data } );
                    },
                    function(err,obj) {
                        response.sendErrorPacket( 404, "" );
                    });
            },
            function(err,state) {
                response.sendErrorPacket( 401, "renew" );  
            });
    }
};