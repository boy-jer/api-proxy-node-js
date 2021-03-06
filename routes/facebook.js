
util = require("util");
var nMemcached = require('memcached');

var config= null;
module.exports.init = function( _config ) {
    config = _config;
};

module.exports.routes =
{
    "/connect/fb":  function (request, response, application, urlObj, queryObj, call_usertoken) {
        if ( application.facebook != undefined ) { 
            var fb_id = application.facebook.app_id;
            var fb_secret =  application.facebook.secret;
            var fb_callback = application.facebook.callback || "http://apic.musixmatch.com/fb/callback";
            var fb_scope= application.facebook.scope || "email,offline_access";
	        var fb_display = application.facebook.display || "popup";

            response.writeHeader(302, {
                'Location': 'https://www.facebook.com/dialog/oauth?client_id=' + fb_id   
                     + "&redirect_uri=" + encodeURIComponent(fb_callback) 
                     + "&scope=" + fb_scope + "&display=" + fb_display + "&response_type=token" ,
                'Content-Type': 'text/plain; charset=utf-8',
                'Set-Cookie': "app_id=" + application.app_id + "; path=/",
                'x-mxm-cache': 'no-cache'
            });
            response.write("");
            response.end();
        }
        else 
        {
            response.sendErrorPacket( 401, "upgrade" );
        }
     },
     "/fb/callback" : function(request, response, application, urlObj, queryObj, call_usertoken) {
     	if ( application.facebook != undefined ) { 
 	        if ( queryObj["redirected"] != undefined ) {
 	            queryObj["usertoken"] = "fb:" + queryObj["access_token"];
 	            
 	            var request_url = "/callback" + '?' + qs.stringify(queryObj);
 	            response.writeHeader(302, {
 	                'Location': request_url,
 	                'Content-Type': 'text/plain; charset=utf-8',
 	                'x-mxm-cache': 'no-cache',
 	                'Set-Cookie': "app_id=; Expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/"
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
     	}
     	else 
     	{
     		response.sendErrorPacket( 401, "upgrade" );
     	}
 	}
};

var createFacebookToken = function(facebook, code, ok_callback, nok_callback) {
    var fb_id = facebook.app_id;
    var fb_secret = facebook.secret;
    var fb_callback = facebook.callback || "http://apic.musixmatch.com/fb/callback";
    var fb_scope= facebook.scope || "email,offline_access";
	var fb_display = facebook.display || "popup";

    var options = {
        host: 'graph.facebook.com',
        port: 443,
        path: '/oauth/access_token?code=' + code+
            "&client_id=" + fb_id +
            "&client_secret=" + fb_secret +
            "&redirect_uri=" + fb_callback,
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
                ok_callback( body );
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
};