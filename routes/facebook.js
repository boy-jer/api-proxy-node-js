
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
                'x-mxm-cache': 'no-cache'
            });
            response.write("");
            response.end();
        }
        else 
        {
            var error_msg = '{"message":{"header":{"status_code":401,"execute_time":0, "hint": "upgrade" },"body":""}}';
            response.writeHeader(200, {
                'Content-Length': error_msg.length,
                'Content-Type': 'text/plain; charset=utf-8',
                'Pragma': 'no-cache'
            });
        }
     }
};