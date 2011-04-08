var http = require('http');
var url = require('url');
var qs = require('querystring');
var memcache = require('memcache');
var crypto = require('crypto');
var mysql = require('mysql');

// CONFIG START

var use_apikey_arr = new Array();			// apikey for this proxy
var valid_userkey_arr = new Array();			// userkey for this proxy
var valid_secret_arr = new Array();			// secret for this proxy

use_apikey_arr[0] = 'your apikey here';
valid_userkey_arr[0] = '1234567890';
valid_secret_arr[0] = 'secretsuper';

use_apikey_arr[1] = 'your apikey here';
valid_userkey_arr[1] = '0987654321';
valid_secret_arr[1] = 'supersecret';

var server_port = 8000;					// server port on which we listen

var memcache_server = 'localhost';			// memcache server host
var memcache_port = 11211;				// memcache server port
var memcachePrefix = 'proxyMxmUserToken';		// memcache prefix
var memcache_memorize_time = 300;			// seconds for usertoken memcache duration

var mysql_server = 'localhost';				// mysql server host
var mysql_port = 3306;					// mysql server port
var mysql_user = 'user';				// mysql_user
var mysql_pass = 'password';				// mysql password
var mysql_db_name = 'proxy';				// mysql database name
var mysql_table_name = 'proxy';				// mysql table name

var api_host = 'api.musixmatch.com';			// musiXmatch api server host
var api_port = 80;					// musiXmatch api server port

var debug = 0;						// activate debug console log


// CONFIG END

//TODO
//require.paths.unshift('.');
//require('config.js');

var handleHTTPRequest = function(request, response) {
	if (debug) console.log('\nConnection from addr: ' + request.socket['remoteAddress'] + ' port: ' + request.socket['remotePort']);
	if (debug) console.log('Parsing: ' + request.url);

	var urlObj = url.parse(request.url, true);
	var queryObj = urlObj['query'];

	var call = urlObj['pathname'];
	var call_userkey = queryObj['userkey'];
	var call_usertoken = queryObj['usertoken'];
	var call_signature = queryObj['signature'].replace(/=+$/g, "");
	var call_signature_protocol = queryObj['signature_protocol'];
	if ( call_signature_protocol != 'md5' && call_signature_protocol != 'sha1' && call_signature_protocol != 'sha256' ) {
		call_signature_protocol = 'sha1'; //queryObj['something']
	}
	
	delete queryObj['signature'];
	delete queryObj['signature_protocol'];

	var valid_userkey = '';
	for ( i=0; i<valid_userkey_arr.length; i++ ) {
		if ( valid_userkey_arr[i] == call_userkey ) {
			var use_apikey = use_apikey_arr[i];
			var valid_userkey = valid_userkey_arr[i];
			var valid_secret = valid_secret_arr[i];
			break;
		}
	}

	if ( valid_userkey == '' ) {
		if (debug) console.log('BAD userkey');
		
		error_msg = '{"message":{"header":{"status_code":401,"execute_time":0},"body":""}}';
	
		response.write(error_msg);
		response.end();
	} else {
		if (debug) console.log('GOOD userkey');

		var now = new Date();
		UTCYear = now.getUTCFullYear();
		UTCMonth = now.getUTCMonth() + 1;
		if (UTCMonth.toString().length==1) { UTCMonth = '0' + UTCMonth; }
		UTCDay = now.getUTCDate();
		if (UTCDay.toString().length==1) { UTCDay = '0' + UTCDay; }
		var signed_url = 'http://' + request.headers['host'] + call + '?' + qs.stringify(queryObj);
		var signed_string = signed_url + UTCYear + UTCMonth + UTCDay;

		var real_signature = crypto.createHmac(call_signature_protocol, valid_secret).update(signed_string).digest(encoding = 'base64').replace(/=+$/g, "");
		
		if (debug) console.log('signature for ' + signed_string + ' is ' + real_signature );
	
	
		var m_conn = new memcache.Connection;
		m_conn.addServer(memcache_server, memcache_port);
		
		if ( call_signature == real_signature && call_userkey == valid_userkey ) {
			if (debug) console.log('GOOD signature');
			
			if ( call == '/ws/1.1/usertoken.get' ) {
				// APPLE RECEIPT CHECK START
				var call_receipt = queryObj['receipt'];
				var call_guid = queryObj['guid'];
				var hashed_receipt = crypto.createHash('sha1').update(call_receipt).digest(encoding='hex');
				
				if ( ! call_receipt || ! call_guid ) {
					if (debug) console.log('BAD receipt / guid');
				
					error_msg = '{"message":{"header":{"status_code":401,"execute_time":0},"body":""}}';
				
					response.write(error_msg);
					response.end();
				} else {
					if (debug) console.log('GOOD receipt / guid');
					
					var Client = mysql.Client;
		    			var client = new Client();
					
					client.host = mysql_server;
					client.port = mysql_port;
					client.user = mysql_user;
					client.password = mysql_pass;
					client.database = mysql_db_name;
					client.connect();
				
					var passed_sql = "SELECT * FROM proxy WHERE userkey = '" + call_userkey + "' AND receipt = '" + hashed_receipt + "'";
					if (debug) console.log( passed_sql );
					client.query( passed_sql, function selectCb(err, results, fields) {
				    		if (err) {
							if (debug) console.log('SQL SELECT ERROR');
						
							error_msg = '{"message":{"header":{"status_code":401,"execute_time":0},"body":""}}';
						
							response.write(error_msg);
							response.end();
				    		} else {
						    	if (debug) console.log("SEL SELECT OK, gave:");
						    	if (debug) console.log(results);
							if ( ! results || ! results[0] ) {
							    	if (debug) console.log("SELECT NO RESULTS");
						
								var passed_sql = "INSERT INTO proxy SET userkey = '" + call_userkey + "', receipt = '" + hashed_receipt + "', guid = '" + call_guid + "'";
								if (debug) console.log( passed_sql );							
								client.query( passed_sql, function selectCb(err, results, fields) {
							    		if (err) {
										if (debug) console.log('SQL INSERT ERROR');
										if (debug) console.log(err);

										error_msg = '{"message":{"header":{"status_code":401,"execute_time":0},"body":""}}';

										response.write(error_msg);
										response.end();
									} else {
										if (debug) console.log('SQL INSERT OK');

										token_msg = '{"message":{"header":{"status_code":200,"execute_time":0},"body":{"user_token":"' + generateUserToken( m_conn ) + '"}}}';

										response.write(token_msg);
										response.end();
									}
								} );
							} else {
							    	if (debug) console.log("SELECT GAVE RESULTS");

							    	db_guid = results[0].guid;
							
								if ( call_guid == db_guid ) {
								    	if (debug) console.log("GUID OK");
								
							    		client.end();

									token_msg = '{"message":{"header":{"status_code":200,"execute_time":0},"body":{"user_token":"' + generateUserToken( m_conn ) + '"}}}';

									response.write(token_msg);
									response.end();
								} else {
								    	if (debug) console.log("DIFFERENT GUID");

									error_msg = '{"message":{"header":{"status_code":401,"execute_time":0},"body":""}}';

									response.write(error_msg);
									response.end();
								}
							}
						}
						client.end();
					} );
				}
				// APPLE RECEIPT CHECK END
			} else {
				if ( ! call_usertoken ) {
					call_usertoken = "";
				}
						
				ret = false
				m_conn.get( memcachePrefix + call_usertoken, function( err, result ) {
					if (err || result == 0) {
						if (debug && err) console.log("MEMCACHE ERROR DURING GET");
						if (debug) console.log('BAD usertoken ' + call_usertoken);

						error_msg = '{"message":{"header":{"status_code":401,"execute_time":0},"body":""}}';

						response.write(error_msg);
						response.end();
					} else {
						if (debug) console.log('GOOD usertoken ' + result);

						delete queryObj['userkey'];
						delete queryObj['usertoken'];
						queryObj['apikey'] = use_apikey;

						request_url = call + '?' + qs.stringify(queryObj);
						if (debug) console.log("Proxing to: " + request_url);

						proxyRequest( request_url, response );
						// proxyRequest will response.end()
					}
				} );
			}
		} else {
			if (debug) console.log('BAD signature');
		
			error_msg = '{"message":{"header":{"status_code":401,"execute_time":0},"body":""}}';
		
			response.write(error_msg);
			response.end();
		}
	}
}

var proxyRequest = function(request_url, response) {
  	connection = http.createClient(api_port, api_host);
	var client_request = connection.request("GET", request_url, { 'host' : api_host });
  	client_request.addListener("response", function (client_response) {
    		response.writeHeader(client_response.statusCode, client_response.headers);
    		client_response.addListener("data", function (chunk) {
			if (debug) console.log("DATA RECEIVED");
      			response.write(chunk);
    		});
    		client_response.addListener("end", function () {
			if (debug) console.log("CONNECTION END");
      			response.end();
    		});
  	});
  	client_request.end();
}

var generateUserToken = function( m_conn ) {
	
	var S4 = function() {
	   	return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
	};
	token = S4()+S4()+S4()+S4()+S4()+S4();

	m_conn.set( memcachePrefix + token, '1', memcache_memorize_time, function( err ) {
		if (err) {
			if (debug) console.log("MEMCACHE ERROR DURING SET");
		}
	});

	return token;	
}
 
var server = http.createServer(handleHTTPRequest);
server.listen(server_port);
