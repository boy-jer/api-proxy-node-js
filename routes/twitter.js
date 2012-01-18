
util = require("util");
var nMemcached = require('memcached');

var OAuth= require('oauth').OAuth;
var Cookies = require('cookies');

var config= null;
module.exports.init = function( _config ) {
    config = _config;
};

module.exports.routes =
{
    "/connect/tw":  function (request, response, application, urlObj, queryObj, call_usertoken) {
    	if ( application.twitter != undefined ) { 
    		var tw_key = application.twitter.key;
    		var tw_secret =  application.twitter.secret;
    		var tw_callback = application.twitter.callback || "http://apic.musixmatch.com/tw/callback";

    		oa= new OAuth("https://twitter.com/oauth/request_token",
    				"https://twitter.com/oauth/access_token", 
    				tw_key, tw_secret, 
    				"1.0A",tw_callback, "HMAC-SHA1");

    		oa.getOAuthRequestToken( function(a, oauth_token, oauth_token_secret,results) {
    			MXMLogger.debug("Twitter token received " +  util.inspect(a) + " " + oauth_token + " " + oauth_token_secret + " " + util.inspect(results) );

    			// 1.http://api.twitter.com/oauth/authorize?oauth_token=8ldIZyxQeVrFZXFOZH5tAwj6vzJYuLQpl0WUEYtWc
    			response.writeHeader( 302, {
    				'Location': 'https://api.twitter.com/oauth/authorize?oauth_token=' + oauth_token,
    				'Content-Type': 'text/plain; charset=utf-8',
    				'Set-Cookie':[ "app_id=" + application.app_id + "; path=/",
    				               "oauth_token=" + oauth_token + "; path=/" ,
    				               "oauth_token_secret=" + oauth_token_secret + "; path=/" ],
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
    },
    "/tw/callback" : function(request, response, application, urlObj, queryObj, call_usertoken) {
    	if ( application.twitter != undefined ) { 
    		var tw_key = application.twitter.key;
    		var tw_secret =  application.twitter.secret;
    		var tw_callback = application.twitter.callback || "http://apic.musixmatch.com/tw/callback";

    		oa= new OAuth("https://twitter.com/oauth/request_token",
    				"https://twitter.com/oauth/access_token", 
    				tw_key, tw_secret, 
    				"1.0A",tw_callback, "HMAC-SHA1");
    		
    		if (queryObj["redirected"] != undefined) {
    			// Now using the request token to get the authorization token
    			cookies = new Cookies(request, response);
    			oa.getOAuthAccessToken( queryObj["oauth_token"], 
    					cookies.get("oauth_token_secret"), queryObj["oauth_token_verifier"],  
    					function(a, oauth_access_token, oauth_access_token_secret, results ){
    				
    				queryObj["oauth_token"] = oauth_access_token;
    				queryObj["oauth_token_secret"] = oauth_access_token_secret;
    				delete queryObj["oauth_verifier"];
        			queryObj["usertoken"] = "tw:" +oauth_access_token_secret + ":" + oauth_access_token_secret;
    				
    				// https://api.twitter.com/oauth/access_token
    				var request_url = "/callback" + '?' + qs.stringify(queryObj);
    				response.writeHeader(302, {
    					'Location' : request_url,
    					'Content-Type' : 'text/plain; charset=utf-8',
    					'Set-Cookie':[ "app_id=; Expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/",
    					               "oauth_token=; Expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/" ,
    					               "oauth_token_secret=; Expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/" ],
    					               'x-mxm-cache' : 'no-cache'
    				});
    				response.end();
    			});
    		} else {
    			response.writeHeader(200, {
    				'Content-Type' : 'text/html; charset=utf-8',
    				'x-mxm-cache' : 'no-cache'
    			});
    			response.write("<script type='text/javascript'>");
    			response
    			.write("document.location = ('' + document.location ).replace('#','?') + '&redirected=1';");
    			response.write("</script>");
    			response.end();
    		}
    	}
    	else 
    	{
    		response.sendErrorPacket( 401, "upgrade" );
    	}
	}
};
