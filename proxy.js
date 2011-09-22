var http  = require('http');
var url  = require('url');
var qs  = require('querystring');
var nMemcached  = require('memcached');
var crypto  = require('crypto');
var mysql  = require('mysql');

var config = require('./proxy-config');
var debug = config.debug;

var recaptchaasync = require('recaptcha-async');


//var model = require('./storage.js');
//require('./storage.js');
//model.TestQuery();

var proxyapi = {
	"/ws/1.1/token.get": function(request,response, application, urlObj, queryObj, call_usertoken ) {
	    var m_conn  = new nMemcached( config.memcache_server  + ":"  + config.memcache_port );
	    var token_msg  = '{"message":{"header":{"status_code":200,"execute_time":0},"body":{"user_token":"'  + generateUserToken( m_conn )  + '"}}}';
	    response.writeHeader(200,  {
  		'Content-Length': token_msg.length,
  		'Content-Type': 'text/plain; charset=utf-8', 
		'x-mxm-cache': 'no-cache' } );
	    response.write(token_msg);
	    response.end();
	}
	,"/captcha": function( request,response, application, urlObj, queryObj, call_usertoken ) {
		var recaptcha = new recaptchaasync.reCaptcha();
	    if (request.method == 'POST') {
	        var body = '';
	        request.on('data', function (data) {
	            body += data;
	        });
	        request.on('end', function () {
	            var POST = qs.parse(body);
				recaptcha.on('data', function (res) {
					var html;
					if(res.is_valid) {
						var m_conn  = new nMemcached( config.memcache_server  + ":"  + config.memcache_port );
						var token_msg  = '{"message":{"header":{"status_code":200,"execute_time":0},"body":{"user_token":"'  + generateUserToken( m_conn )  + '"}}}';
					    response.write(token_msg);
					    response.end();
					} else {
						html = recaptcha.getCaptchaHtml(application.recaptcha.public_key, res.error);
						response.write('<html><body><form action="" method="post">'  + html + "</form></body></html>");
					    response.end();
					}
				});
		
				recaptcha.checkAnswer(application.recaptcha.private_key, 
						request.connection.remoteAddress, 
						POST["recaptcha_challenge_field"] , 
						POST["recaptcha_response_field"] );
	        });
	    } else {
			var html = recaptcha.getCaptchaHtml(application.recaptcha.public_key, "");
			response.write('<html><body><form action="" method="post">'  + html + "</form></body></html>");
		    response.end();
	    }
	}
}

//TODO
//require.paths.unshift('.');
//require('config.js');
var handleHTTPRequest  = function(request, response)  {

    var urlObj  = url.parse(request.url, true);
    var queryObj  = urlObj['query'];
    var call  = urlObj['pathname'];
    if ( call == '/robots.txt' ) {
        response.write("Disallow: All\n");
        response.end();
        return ;
    }
    if (debug) console.log('\nConnection from addr: '  + request.socket['remoteAddress']  + ' port: '  + request.socket['remotePort']);
    if (debug) console.log('Parsing: '  + request.url);
    var call_app_id  = queryObj['app_id'];
    var call_usertoken  = queryObj['usertoken'];
    var call_signature  = queryObj['signature']!=null ? queryObj['signature'].replace(/=+$/g, "") : "";
    var call_signature_protocol  = queryObj['signature_protocol'];
    if ( call_signature_protocol  != 'md5'  && call_signature_protocol  != 'sha1'  && call_signature_protocol  != 'sha256' )  {
        call_signature_protocol  = 'sha1';
    }
    delete queryObj['signature'];
    delete queryObj['signature_protocol'];
 
    // *******************************
    // CHECK 1: the application exists
    var valid_userkey  = '';
    var application = config.applications[call_app_id];
    if (application !=null) {
        var use_apikey  = application.apikey;
        var valid_userkey  = application.app_id;
        var valid_secret  = application.app_secret;        
        if(debug) console.log('Found application: ' + application.app_name);    
    }

    if ( valid_userkey  == '' )  {
        if (debug) console.log('BAD userkey');
        var error_msg  = '{"message":{"header":{"status_code":401,"execute_time":0, "hint": "upgrade" },"body":""}}';
        response.write(error_msg);
        response.end();
    } else  {
        if (debug) console.log('GOOD userkey');

        // *********************************
        // CHECK 2: the signature is correct
        var signed_url  = 'http://'  + request.headers['host']  + call  + '?'  + qs.stringify(queryObj);
        var secure_signed_url  = 'https://'  + request.headers['host']  + call  + '?'  + qs.stringify(queryObj);
	
        var real_signature = calculateSignature( signed_url, application, call_signature_protocol );
        var secure_real_signature = calculateSignature( secure_signed_url, application, call_signature_protocol );

        if ( ( call_signature  == real_signature || call_signature == secure_real_signature) && call_app_id  == application.app_id )  {
            if (debug) console.log('GOOD signature');
            
            if ( proxyapi[ call ] !=null)
            	proxyapi[ call ](request,response, application,urlObj,queryObj, call_usertoken)
            else
            	defaultRouteAction(request,response, application,urlObj,queryObj, call_usertoken);
        } else  {
            if (debug) console.log('BAD signature');
            error_msg = '{"message":{"header":{"status_code":401,"execute_time":0, "hint": "invalid_signature" },"body":""}}';
            response.write(error_msg);
            response.end();
        }
    }
}

var defaultRouteAction = function(request,response, application, urlObj, queryObj, call_usertoken) {
    var m_conn  = new nMemcached( config.memcache_server  + ":"  + config.memcache_port );
    if (  ! call_usertoken )  {
        call_usertoken  = "";
    }
    var ret  = false;
    m_conn.get( config.memcachePrefix  + call_usertoken, function( err, result )  {
        if (err  || result  == 0)  {
            if (debug  && err) console.log("MEMCACHE ERROR DURING GET");
            if (debug) console.log('BAD usertoken '  + call_usertoken);
            var error_msg = '{"message":{"header":{"status_code":401,"execute_time":0, "hint": "renew"},"body":""}}';
            response.write(error_msg);
            response.end();
        } else  {
            if (debug) console.log('GOOD usertoken '  + result);
            delete queryObj['userkey'];
            delete queryObj['usertoken'];
            queryObj['apikey']  = application.apikey;
            var request_url  = urlObj['pathname']  + '?'  + qs.stringify(queryObj);
            if (debug) console.log("Proxing to: "  + request_url);
            proxyRequest( request_url, response );
  
            //refreshes the token
            //m_conn.set( config.memcachePrefix  + call_usertoken, result, config.memcache_memorize_time, function( err )  {
            //    if (err)  {
            //        if (debug) console.log("MEMCACHE ERROR DURING SET");
            //    }
            //});
        }
    });
}

var proxyRequest  = function(request_url, response)  {
	try {
	    var connection  = http.createClient(config.api_port, config.api_host);
	    var client_request  = connection.request("GET", request_url,  {
	        'host' : config.api_host
	    });
	    
		connection.addListener('error', function(connectionException){
		    if(debug) console.log(connectionException);
		    response.end();
		});	    

	    client_request.addListener("response", function (client_response)  {
	    	try {
			// var cachebypass = new Array( [ [ "x-mxm-bypass-webcache", 1 ] ]  );
			// var headers = cachebypass.concat( client_response.headers );
			var headers =  client_response.headers ;
			headers[ "x-mxm-cache" ] = "no-cache";
			if ( debug ) console.log( headers ); 
		        response.writeHeader(client_response.statusCode, headers );
		        client_response.addListener("data", function (chunk)  {
		            if (debug) console.log("DATA RECEIVED");
		            response.write(chunk);
		        });
		        client_response.addListener("end", function ()  {
		            if (debug) console.log("CONNECTION END");
		            response.end();
		        });
	        } 
	    	catch( e ) {
			if ( debug ) console.log ( e );
			response.end();
	    	}
	    });
	    client_request.end();
    }
	catch(e) {
		if ( debug ) console.log ( e );
		response.end();
	}
}

var generateUserToken  = function( m_conn )  {
    var S4  = function()  {
        return (((1 + Math.random()) * 0x10000)|0).toString(16).substring(1);
    };
    var token  = S4() + S4() + S4() + S4() + S4() + S4();
    m_conn.set( config.memcachePrefix  + token, '1', config.memcache_memorize_time, function( err )  {
        if (err)  {
            if (debug) console.log("MEMCACHE ERROR DURING SET");
        }
    });
    return token;
}

var calculateSignature = function( signed_url, application, call_signature_protocol) {
    var now  = new Date();
    var UTCYear  = now.getUTCFullYear();
    var UTCMonth  = now.getUTCMonth()  + 1;
    if (UTCMonth.toString().length == 1)  {
        UTCMonth  = '0'  + UTCMonth;
    }
    var UTCDay  = now.getUTCDate();
    if (UTCDay.toString().length == 1)  {
        UTCDay  = '0'  + UTCDay;
    }

    var signed_string  = signed_url  + UTCYear  + UTCMonth  + UTCDay;
    var real_signature  = crypto.createHmac(call_signature_protocol, application.app_secret).update(signed_string).digest('base64').replace(/=+$/g, "");
    if (debug) console.log('signature for '  + signed_string  + ' is '  + real_signature );
	return real_signature;
}

var catchedHandleHTTPRequest =  function(request, response)  {
	try {
		response.setHeader("x-mxm-cache", "no-cache" );
		handleHTTPRequest(request,response);
	} catch( e )
	{
		if (debug) console.log( '>> ' + e.message);
		response.end();
	}
}

/* 
                // APPLE RECEIPT CHECK START
                var call_receipt  = queryObj['receipt'];
                var call_guid  = queryObj['guid'];
                var hashed_receipt  = crypto.createHash('sha1').update(call_receipt).digest(encoding = 'hex');
                if (  ! call_receipt  ||  ! call_guid )  {
                    if (debug) console.log('BAD receipt / guid');
                    error_msg  = '{"message":{"header":{"status_code":401,"execute_time":0},"body":""}}';
                    response.write(error_msg);
                    response.end();
                } else  {
                    if (debug) console.log('GOOD receipt / guid');
                    var Client  = mysql.Client;
                    var client  = new Client();
                    client.host  = mysql_server;
                    client.port  = mysql_port;
                    client.user  = mysql_user;
                    client.password  = mysql_pass;
                    client.database  = mysql_db_name;
                    var passed_sql  = "SELECT * FROM proxy WHERE userkey = '"  + call_userkey  + "' AND receipt = '"  + hashed_receipt  + "'";
                    if (debug) console.log( passed_sql );
                    //response.write("pippo");
                    					//response.end();
                    					//return;
                    client.query( passed_sql, function selectCb(err, results, fields)  {
                        if (err)  {
                            if (debug) console.log('SQL SELECT ERROR');
                            error_msg  = '{"message":{"header":{"status_code":401,"execute_time":0},"body":""}}';
                            response.write(error_msg);
                            response.end();
                        } else  {
                            if (debug) console.log("SEL SELECT OK, gave:");
                            if (debug) console.log(results);
                            if (  ! results  ||  ! results[0] )  {
                                if (debug) console.log("SELECT NO RESULTS");
                                var passed_sql  = "INSERT INTO proxy SET userkey = '"  + call_userkey  + "', receipt = '"  + hashed_receipt  + "', guid = '"  + call_guid  + "'";
                                if (debug) console.log( passed_sql );
                                	client.query( passed_sql, function selectCb(err, results, fields)  {
                                    if (err)  {
                                        if (debug) console.log('SQL INSERT ERROR');
                                        if (debug) console.log(err);
                                        error_msg  = '{"message":{"header":{"status_code":401,"execute_time":0},"body":""}}';
                                        response.write(error_msg);
                                        response.end();
                                    } else  {
                                        if (debug) console.log('SQL INSERT OK');
                                        token_msg  = '{"message":{"header":{"status_code":200,"execute_time":0},"body":{"user_token":"'  + generateUserToken( m_conn )  + '"}}}';
                                        response.write(token_msg);
                                        response.end();
                                    }
                                });
                            } else  {
                                if (debug) console.log("SELECT GAVE RESULTS");
                                db_guid  = results[0].guid;
                                if ( call_guid  == db_guid )  {
                                    if (debug) console.log("GUID OK");
                                    client.end();
                                    token_msg  = '{"message":{"header":{"status_code":200,"execute_time":0},"body":{"user_token":"'  + generateUserToken( m_conn )  + '"}}}';
                                    response.write(token_msg);
                                    response.end();
                                } else  {
                                    if (debug) console.log("DIFFERENT GUID");
                                    error_msg  = '{"message":{"header":{"status_code":401,"execute_time":0},"body":""}}';
                                    response.write(error_msg);
                                    response.end();
                                }
                            }
                        }
                        client.end();
                    });
                }
                // APPLE RECEIPT CHECK END
 */


var server  = http.createServer(catchedHandleHTTPRequest);
server.listen(config.server_port);

