var cluster = require('cluster');
var http = require('http');
var https = require('https');
var url = require('url');
var qs = require('querystring');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');

var config = require('../proxy-config');
var config_loader = require('../config-loader');
var debug = config.debug;

var storage = require("./storage.js")
storage.init(config);

var recaptchaasync = require('recaptcha-async');
config_loader.init(config);
var proxyapi = config_loader.routes;

var handleHTTPRequest = function (request, response) {
    var urlObj = url.parse(request.url, true);
    var queryObj = urlObj['query'];
    var call = urlObj['pathname'];

    if (debug) console.log('\nConnection from addr: ' + request.socket['remoteAddress'] + ' port: ' + request.socket['remotePort']);
    if (debug) console.log('Parsing: ' + request.url);
    var call_app_id = queryObj['app_id'];
    if ( call_app_id == undefined ) {
        // This has not to be handled by this function
        return false;
    }

    var call_usertoken = queryObj['usertoken'];
    var call_signature = queryObj['signature'] != null ? queryObj['signature'].replace(/=+$/g, "") : "";
    var call_signature_protocol = queryObj['signature_protocol'];
    if (call_signature_protocol != 'md5' && call_signature_protocol != 'sha1' && call_signature_protocol != 'sha256') {
        call_signature_protocol = 'sha1';
    }
    delete queryObj['signature'];
    delete queryObj['signature_protocol'];

    // *******************************
    // CHECK 1: the application exists
    var valid_userkey = '';
    var application = config_loader.applications[call_app_id];
    if (application != null) {
        var use_apikey = application.apikey;
        valid_userkey = application.app_id;
        var valid_secret = application.app_secret;
        if (debug) console.log('Found application: ' + application.app_name);
    }

    if (valid_userkey == '') {
        if (debug) console.log('BAD api_id');
        var error_msg = '{"message":{"header":{"status_code":401,"execute_time":0, "hint": "upgrade" },"body":""}}';
        response.writeHeader(200, {
            'Content-Length': error_msg.length,
            'Content-Type': 'text/plain; charset=utf-8',
            'Pragma': 'no-cache'
        });
        response.write(error_msg);
        response.end();
    } else {
        if (debug) console.log('GOOD api_id');

        // *********************************
        // CHECK 2: the signature is correct

        var signed_url = 'http://' + request.headers['host'] + call + '?' + qs.stringify(queryObj);
        var secure_signed_url = 'https://' + request.headers['host'] + call + '?' + qs.stringify(queryObj);

        var real_signature = calculateSignature(signed_url, application, call_signature_protocol);
        var secure_real_signature = calculateSignature(secure_signed_url, application, call_signature_protocol);

        if (((call_signature == real_signature || call_signature == secure_real_signature) && call_app_id == application.app_id) ||
                application.sign_calls == false) {
            if (debug) console.log('GOOD signature');

            if (proxyapi[call] != null)
                proxyapi[call](request, response, application, urlObj, queryObj, call_usertoken)
            else {
                defaultRouteAction(request, response, application, urlObj, queryObj, call_usertoken);
            }
        } else {
            if (debug) console.log('BAD signature expected >>' + call_signature + '<<');
            error_msg = '{"message":{"header":{"status_code":401,"execute_time":0, "hint": "invalid_signature" },"body":""}}';
            response.writeHeader(200, {
                'Content-Length': error_msg.length,
                'Content-Type': 'text/plain; charset=utf-8',
                'Pragma': 'no-cache'
            });
            response.write(error_msg);
            response.end();
        }
    }
    return true; // mark request has been handled...
}

var defaultRouteAction = function (request, response, application, urlObj, queryObj, call_usertoken) {
    try {
        var ret = false;
        if (!call_usertoken) {
            call_usertoken = "";
        }

        storage.getAppData( "tokens", application, call_usertoken, function(result) {
                if (debug) console.log('GOOD usertoken ' + JSON.stringify( result ) );
                delete queryObj['userkey'];
                delete queryObj['usertoken'];

                token_app = result;
                if (debug) console.log('forwarding with apikey ' + token_app.apikey);
                queryObj['apikey'] = token_app.apikey; //application.apikey;
                var request_url = urlObj['pathname'] + '?' + qs.stringify(queryObj);
                if (debug) console.log("Proxing to: " + request_url);
                proxyRequest(request_url, request, response, token_app.headers);
            }, function(err) {
                if (call_usertoken.substring(0, 3) == "fb:") {
                    var fbtoken = call_usertoken.substring(3);
                    if (debug) console.log("facebook token: " + fbtoken);

                    // https://graph.facebook.com/me?access_token=<usertoken>
                    //
                    checkFacebookToken(application.facebook.app_id, fbtoken, function () {
                        if (debug) console.log("fbtoken is ok");

                        token_app = application;
                        if (debug) console.log('forwarding with apikey ' + token_app.apikey);
                        queryObj['apikey'] = token_app.apikey; //application.apikey;
                        var request_url = urlObj['pathname'] + '?' + qs.stringify(queryObj);
                        if (debug) console.log("Proxing to: " + request_url);
                        proxyRequest(request_url, request, response, token_app.headers );

                        storage.setAppData( "tokens", application, call_usertoken, null,null);
                    }, function () {
                        if (debug) console.log("fbtoken is NOK");
                        var error_msg = '{"message":{"header":{"status_code":401,"execute_time":0, "hint": "renew" },"body":""}}';
                        response.writeHeader(200, {
                            'Content-Length': error_msg.length,
                            'Content-Type': 'text/plain; charset=utf-8',
                            'Pragma': 'no-cache'
                        });
                        response.write(error_msg);
                        response.end();
                    });
                }
                else {
                    if (debug && err) console.log("MEMCACHE ERROR DURING GET");
                    if (debug) console.log('BAD usertoken ' + call_usertoken);
                    var error_msg = '{"message":{"header":{"status_code":401,"execute_time":0, "hint": "renew" },"body":""}}';
                    response.writeHeader(200, {
                        'Content-Length': error_msg.length,
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Pragma': 'no-cache'
                    });
                    response.write(error_msg);
                    response.end();
                }
            });
        if (debug) console.log("aa");
    } catch (e) {
        if (debug) console.log("Error in default user action: " + JSON.stringify(e) );
        var error_msg = '{"message":{"header":{"status_code":401,"execute_time":0, "hint": "renew" },"body":""}}';
        response.writeHeader(200, {
            'Content-Length': error_msg.length,
            'Content-Type': 'text/plain; charset=utf-8',
            'Pragma': 'no-cache'
        });
        response.write(error_msg);
        response.end();
    }
}

var proxyRequest = function (request_url, request, response, app_headers ) {
    try {
        //var connection = http.createClient(config.api_port, config.api_host, agent:false);
        //var headers = request.headers;
        //headers["host"] = config.api_host;
        //var client_request = connection.request("GET", request_url, headers);

        var myheaders = request.headers;
        myheaders["host"] = config.api_host;
        var client_request = http.request( { 
            host: config.api_host, 
            port: config.api_port, 
            method: "GET",
            path: request_url,
            agent: false,
            headers: myheaders
        });

        // connection.addListener('error', function (connectionException) {
        client_request.addListener('error', function (connectionException) {
            if (debug) console.log("error adding the proxying req listener" + connectionException);
            response.end();
        });

        client_request.addListener("response", function (client_response) {
            try {
                // var cachebypass = new Array( [ [ "x-mxm-bypass-webcache", 1 ] ]  );
                // var headers = cachebypass.concat( client_response.headers );
                var headers = client_response.headers;
                if (app_headers != undefined) {
                    for (var i in app_headers) {
                        if (debug) console.log("adding header " + i + " with val " + app_headers[i]);
                        headers[i] = app_headers[i];
                    }
                }
                headers["x-mxm-cache"] = "no-cache";
                if (debug) console.log(headers);
                response.writeHeader(client_response.statusCode, headers);
                client_response.addListener("data", function (chunk) {
                    //if (debug) console.log("DATA RECEIVED");
                    response.write(chunk);
                });
                client_response.addListener("end", function () {
                    if (debug) console.log("CONNECTION END");
                    response.end();
                });
            }
            catch (e) {
                if (debug) console.log("error proxying the request " + e);
                response.end();
            }
        });
        client_request.end();
    }
    catch (e) {
        if (debug) console.log("error creating the proxying request " + e);
        response.end();
    }
}

var checkFacebookToken = function (facebook_application, facebook_token, ok_callback, nok_callback) {
    var options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/me?access_token=' + facebook_token,
        agent: false,
        method: 'GET'
    };

    var req = https.request(options, function (client_response) {
        try {
            if (debug) console.log("connected to facebook");
            var body = '';
            client_response.on('data', function (data) {
                if (debug) console.log(".");
                body += data;
            });
            client_response.on('end', function () {
                if (debug) console.log("!");
                var fbprofile = JSON.parse(body);
                if (debug) console.log(fbprofile);
                if (fbprofile.id != undefined)
                    ok_callback();
                else
                    nok_callback();
            });
        }
        catch (e) {
            if (debug) console.log(e);
            nok_callback();
        }
    });

    req.on('error', function (e) {
        if (debug) console.log(connectionException);
        nok_callback();
    });

    req.end();
}


var calculateSignature = function (signed_url, application, call_signature_protocol) {
    var now = new Date();
    var UTCYear = now.getUTCFullYear();
    var UTCMonth = now.getUTCMonth() + 1;
    if (UTCMonth.toString().length == 1) {
        UTCMonth = '0' + UTCMonth;
    }
    var UTCDay = now.getUTCDate();
    if (UTCDay.toString().length == 1) {
        UTCDay = '0' + UTCDay;
    }

    var signed_string = signed_url + UTCYear + UTCMonth + UTCDay;
    var real_signature = crypto.createHmac(call_signature_protocol, application.app_secret).update(signed_string).digest('base64').replace(/=+$/g, "");
    if (debug) console.log('signature for ' + signed_string + ' is ' + real_signature);
    return real_signature;
}

var catchedHandleHTTPRequest = function (request, response) {
    try {
        response.setHeader("x-mxm-cache", "no-cache");

        var res = handleHTTPRequest(request, response );
        if ( res == false ) res = handleAuthCallback(request, response);
        if ( res == false ) res = handleStaticHTTPRequest(request, response);
    } catch (e) {
        if (debug) console.log('>> ' + e.message);
        response.end();
    }
}

var handleStaticHTTPRequest = function (request, response ) {
    if (debug) console.log("base path: " + process.cwd() + "/static");
    var uri = url.parse(request.url).pathname;
    if (debug) console.log("uri " + uri);
    var filename = path.join(process.cwd() + "/static", uri);
    if (debug) console.log("Accessing path: " + filename);
    path.exists(filename, function (exists) {
        if (!exists) {
            response.writeHead(404);
            response.write("Not found","binary");
            response.end();
            return;
        }

        if (fs.statSync(filename).isDirectory()) filename += '/index.html';

        fs.readFile(filename, "binary", function (err, file) {
            if (err) {
                response.writeHead(500, { "Content-Type": "text/plain" });
                response.write(err + "\n");
                response.end();
                return;
            }
            response.writeHead(200);
            response.write(file, "binary");
            response.end();
        });
    });
}

var handleAuthCallback = function ( request, response ) {
    var urlObj = url.parse(request.url, true);
    var queryObj = urlObj['query'];
    var call = urlObj['pathname'];
    if ( call == "/callback" ){
        response.writeHead(200);
        if (queryObj["usertoken"] == undefined  )
            response.write("FAILED", "binary");
        else
            response.write("OK", "binary" );
        response.end();
        return true;
    }
    else if ( call == "/fb/callback" ) {

        if ( queryObj["redirected"] != undefined ) {
            queryObj["usertoken"] = "fb:" + queryObj["access_token"];
            
            var request_url = "/callback" + '?' + qs.stringify(queryObj);
            response.writeHeader(302, {
                'Location': request_url,
                'Content-Type': 'text/plain; charset=utf-8',
                'x-mxm-cache': 'no-cache'
            });
            response.end();
        }
        else {
            response.writeHeader(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'x-mxm-cache': 'no-cache'
            });
            response.write("<script type='text/javascript'>");
            response.write("document.location = ('' + document.location ).replace('#','?') + '&redirected=1';");
            response.write("</script>" );
            response.end();
        }
        return true;
    }
    return false;
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


module.exports.server = catchedHandleHTTPRequest;