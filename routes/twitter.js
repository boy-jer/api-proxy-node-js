
util = require("util");
var nMemcached = require('memcached');

var OAuth= require('oauth').OAuth;

var config= null;
module.exports.init = function( _config ) {
    config = _config;
};

module.exports.routes =
{
    "/connect/tw":  function (request, response, application, urlObj, queryObj, call_usertoken) {
        if ( application.facebook != undefined ) { 
            var tw_key = application.twitter.key;
            var tw_secret =  application.twitter.secret;
            var tw_callback = application.twitter.callback || "http://apic.musixmatch.com/tw/callback";

            oa= new OAuth("https://twitter.com/oauth/request_token",
                         "https://twitter.com/oauth/access_token", 
                         tw_key, tw_secret, 
                         "1.0A",tw_callback, "HMAC-SHA1");
            
            oa.getOAuthRequestToken( function(a, oauth_token, oauth_token_secret,results) {
            	MXMLogger.debug("Twitter token received " +  util.inspect(a) + " " + oauth_token + " " + oauth_token_secret + " " + util.inspect(results) );
            	
            	//1.http://api.twitter.com/oauth/authorize?oauth_token=8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc
            	response.writeHeader( 302, {
                    'Location': 'https://api.twitter.com/oauth/authorize?oauth_token=' + oauth_token,
                    	'Content-Type': 'text/plain; charset=utf-8',
                    	'Set-Cookie': "app_id=" + application.app_id + "; path=/",
                    	'Set-Cookie': "oauth_token=" + oauth_token + "; path=/",
                    	'Set-Cookie': "oauth_token_secret=" + oauth_token_secret + "; path=/",
                    	'x-mxm-cache': 'no-cache'
            	});
            	response.write("");
            	response.end();
            });
        }
        else 
        {
            response.sendErrorPacket( 401, "upgrade" );
        }
     }
};
