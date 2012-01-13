util = require("util");
storage = require( "../lib/storage" );

var config= null;
module.exports.init = function( _config ) {
    config = _config;
};

var validateParameters = function( userdata_id, params, keyparametername)
{
	if (typeof(keyparametername) == undefined ) 
		keyparametername = "userdata_id"
	var blacklist = [ 'usertoken', 'apikey', 'last_updated', 'namespace', 'user_id' ];
	params = JSON.parse(JSON.stringify(params));
	params[keyparametername] = userdata_id;
	
	for( var k in blacklist) {
		delete params[blacklist[k]];
	}
	return params;
};

module.exports.routes =
{
    "/ws/1.1/tokendata.get":  function (request, response, application, urlObj, queryObj, call_usertoken) {
        request.validateToken(application, call_usertoken,
            function(data,state) {
                storage.getAppData( "token_" + queryObj["namespace"], application, call_usertoken + ":" + queryObj["tokendata_id"],
                    function(data,obj) {
                		delete data["$ItemName"];
                		delete data["user_id"];
                        response.sendPacket( { tokendata: data } );
                    },
                    function(err,obj) {
                        response.sendErrorPacket( 404, "" );
                    });;
            },
            function(err,state) {
                response.sendErrorPacket( 401, "not_authorized" );
            });
    },
    "/ws/1.1/tokendata.post":  function (request, response, application, urlObj, queryObj, call_usertoken) { 
        request.validateToken(application, call_usertoken,
            function(data,state) {
                if (request.method == 'POST') {
                    var body = request.MXMBody;
                	try { 
                        MXMLogger.debug( "Saving token: " + body);
                        var POST = JSON.parse(body);
    	                storage.setAppData( "token_" + queryObj["namespace"], application, call_usertoken + ":" + queryObj["tokendata_id"], validateParameters( queryObj["tokendata_id"], POST, "tokendata_id"), 
    		                    function(data,obj) {
    		                        response.sendPacket( { userdata: data } );
    		                    },
    		                    function(err,obj) {
    		                        response.sendErrorPacket( 404, "" );
    		                    });
                	} catch(e) {
                        response.sendErrorPacket( 401, "incorrect_format" );
                	}
                }
                else
	                storage.setAppData( "token_" + queryObj["namespace"], application,  call_usertoken + ":" + queryObj["tokendata_id"], validateParameters( queryObj["tokendata_id"], queryObj, "tokendata_id"), 
		                    function(data,obj) {
		                        response.sendPacket( { userdata: data } );
		                    },
		                    function(err,obj) {
		                        response.sendErrorPacket( 404, "" );
		                    });	                
            },
            function(err,state) {
                response.sendErrorPacket( 401, "not_authorized" );  
            });
    },
    "/ws/1.1/userdata.get":  function (request, response, application, urlObj, queryObj, call_usertoken) {
        request.validateToken(application, call_usertoken,
            function(data,state) {
                var account = data.accounts[0];
                if  ( account!=null && account.user_id != null ) {
	                storage.getUserData( "uns_" + queryObj["namespace"], account, queryObj["userdata_id"],
	                    function(data,obj) {
	                		delete data["$ItemName"];
	                		delete data["user_id"];
	                        response.sendPacket( { userdata: data } );
	                    },
	                    function(err,obj) {
	                        response.sendErrorPacket( 404, "" );
	                    });;
                }
                else
                	response.sendErrorPacket(404,"");
            },
            function(err,state) {
                response.sendErrorPacket( 401, "not_authorized" );
            });
    },
    "/ws/1.1/userdata.post":  function (request, response, application, urlObj, queryObj, call_usertoken) { 
        request.validateToken(application, call_usertoken,
            function(data,state) {
        	
        		if (data.accounts && data.accounts.length >0) {
	                var account = data.accounts[0];
	                if  ( account != null && account.user_id != null ) {
		                //read from the post the json document to save 
		                if (request.method == 'POST') {
		                    /*var body = '';
		                    request.on('data', function (data) {
		                    	MXMLogger.debug( "Saving userdata: " + data);
		                        body += data;
		                    });
		                    request.on('end', function () {
		                    	try { 
			                        MXMLogger.debug( "Saving userdata: " + body);
			                        var POST = JSON.parse(body);
			    	                storage.setUserData( "uns_" + queryObj["namespace"], account, queryObj["userdata_id"], validateParameters( queryObj["userdata_id"], POST), 
			    		                    function(data,obj) {
			    		                        response.sendPacket( { userdata: data } );
			    		                    },
			    		                    function(err,obj) {
			    		                        response.sendErrorPacket( 404, "" );
			    		                    });
		                    	} catch(e) {
			                        response.sendErrorPacket( 401, "incorrect_format" );
		                    	}
		                    });*/
		                    var body = request.MXMBody;
	                    	try { 
		                        MXMLogger.debug( "Saving userdata: " + body);
		                        var POST = JSON.parse(body);
		    	                storage.setUserData( "uns_" + queryObj["namespace"], account, queryObj["userdata_id"], validateParameters( queryObj["userdata_id"], POST), 
		    		                    function(data,obj) {
		    		                        response.sendPacket( { userdata: data } );
		    		                    },
		    		                    function(err,obj) {
		    		                        response.sendErrorPacket( 404, "" );
		    		                    });
	                    	} catch(e) {
		                        response.sendErrorPacket( 401, "incorrect_format" );
	                    	}
		                }
		                else
	    	                storage.setUserData( "uns_" + queryObj["namespace"], account, queryObj["userdata_id"], validateParameters( queryObj["userdata_id"], queryObj), 
	    		                    function(data,obj) {
	    		                        response.sendPacket( { userdata: data } );
	    		                    },
	    		                    function(err,obj) {
	    		                        response.sendErrorPacket( 404, "" );
	    		                    });
	                }
	                else 
	                	 response.sendErrorPacket( 401, "not_authorized" );
        		} else 
        			response.sendErrorPacket( 404, "" );
            },
            function(err,state) {
                response.sendErrorPacket( 401, "not_authorized" );  
            });
    }
};