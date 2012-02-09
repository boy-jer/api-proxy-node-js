util = require("util");
storage = require( "../lib/storage" );

var config= null;
module.exports.init = function( _config ) {
    config = _config;
};

var validateParameters = function( userdata_id, params, keyparametername)
{
	if (typeof(keyparametername) == "undefined" ) 
		keyparametername = "userdata_id";
	
	MXMLogger.debug("using keyparametername: "  + userdata_id );
	
	var blacklist = [ 'usertoken', 'apikey', 'last_updated', 'namespace', 'user_id', keyparametername ];
	params = JSON.parse(JSON.stringify(params));
	for( var k in blacklist) {
		delete params[blacklist[k]];
	}
	params[keyparametername] = userdata_id;
	

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
			MXMLogger.debug( "incorrect_format (/ws/1.1/tokendata.post)");
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
	MXMLogger.debug("/ws/1.1/userdata.post");
        request.validateToken(application, call_usertoken,
            function(data,state) {
        	
			MXMLogger.debug("/ws/1.1/userdata.post: token validated");
        		if (data.accounts && data.accounts.length >0) {
			MXMLogger.debug("/ws/1.1/userdata.post: has account");
	                var account = data.accounts[0];
	                if  ( account != null && account.user_id != null ) {
		                //read from the post the json document to save 
		                if (request.method == 'POST') {
			MXMLogger.debug("/ws/1.1/userdata.post: is POST");
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
	                    		MXMLogger.debug( "Error in user blog post: " + util.inspect(e));
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
    },
    "/ws/1.1/userblob.get":  function (request, response, application, urlObj, queryObj, call_usertoken) {
        request.validateToken(application, call_usertoken,
            function(data,state) {
                var account = data.accounts[0];
                if  ( account!=null && account.user_id != null ) {
	                storage.getUserBlob( "uns_" + queryObj["namespace"], account, queryObj["userblob_id"],
	                    function(data,obj) {
	                		MXMLogger.debug("sending blob back of size..." +data.length);
		                    response.writeHeader(200, {
		                        'Content-Type': 'application/octet-stream',
		                        'x-mxm-cache': 'no-cache'
		                    });
		                    response.write(data, "binary");
		                    response.end();
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
    "/ws/1.1/userblob.post":  function (request, response, application, urlObj, queryObj, call_usertoken) { 
        request.validateToken(application, call_usertoken,
            function(data,state) {
			MXMLogger.debug("/ws/1.1/userblob.post: token validated: "+ util.inspect(data.accounts) );
        		if (data.accounts && data.accounts.length >0) {
			MXMLogger.debug("/ws/1.1/userblob.post: has account");
	                var account = data.accounts[0];
	                if  ( account != null && account.user_id != null ) {
		                if (request.method == 'POST') {
				MXMLogger.debug("ws/1.1/userblob.post: it's a POST: " + typeof(request.MXMBody));
		                    var body = request.MXMBody;

				request.MXMBodyFinished = function ( body ) {
	                    	try { 
		                        MXMLogger.debug( "Saving userdata for id " + queryObj["userblob_id"] + " of size " + body.length);
		    	                storage.setUserBlob( "uns_" + queryObj["namespace"], account, queryObj["userblob_id"], body, 
		    		                    function(data,obj) {
		    	                	 		MXMLogger.debug( "Sending back reply to blob post");
		    		                        response.sendPacket( { userdata: { bytes_saved: body.length }  } );
		    		                    },
		    		                    function(err,obj) {
		    		                        response.sendErrorPacket( 404, "" );
		    		                    });
	                    	} catch(e) {
					MXMLogger.debug( "Incorrect format for userblob.post: " + util.inspect(e));	
		                        response.sendErrorPacket( 401, "incorrect_format" );
	                    	}
				}
/*
	                    	try { 
		                        MXMLogger.debug( "Saving userdata for id " + queryObj["userblob_id"] + " of size " + body.length);
		    	                storage.setUserBlob( "uns_" + queryObj["namespace"], account, queryObj["userblob_id"], body, 
		    		                    function(data,obj) {
		    	                	 		MXMLogger.debug( "Sending back reply to blob post");
		    		                        response.sendPacket( { userdata: { bytes_saved: body.length }  } );
		    		                    },
		    		                    function(err,obj) {
		    		                        response.sendErrorPacket( 404, "" );
		    		                    });
	                    	} catch(e) {
					MXMLogger.debug( "Incorrect format for userblob.post: " + util.inspect(e));	
		                        response.sendErrorPacket( 401, "incorrect_format" );
	                    	}
*/		                }
		                else {
				MXMLogger.debug("ws/1.1/userblob.post: it's a GET");
	    	                storage.setUserBlob( "uns_" + queryObj["namespace"], account, queryObj["userblob_id"], queryObj["blob_data"], 
	    		                    function(data,obj) {
	    		                        response.sendPacket( { userdata: { length:  queryObj["blob_data"].length } } );
	    		                    },
	    		                    function(err,obj) {
	    		                        response.sendErrorPacket( 404, "" );
	    		                    });
				}
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
