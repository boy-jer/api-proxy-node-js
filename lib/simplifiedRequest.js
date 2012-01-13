
var url = require('url');
var qs = require('querystring');
var http = require('http');

module.exports.simplifiedRequest = function ( urlprefix ) {
	this.myurl = url.parse(urlprefix);
	
	this.get = function (smethod, params, on_ok, on_error, state) {
		var options = {
				host:  this.myurl.hostname,
				port:  this.myurl.port,
			    path:  this.myurl.pathname + smethod + "?" + qs.stringify( params ) ,
			    agent: false
			};
		MXMLogger.debug( "sending request to: " + util.inspect(options));
		http.get( options, function(res) {
			try {
		    	var body = "";
		    	res.addListener("data", function (chunk) {
		        	body+=chunk;
		        });
		    	res.addListener("end", function () {
		    		try {
	    	        	var message = JSON.parse(body);
	    	        	on_ok(message,state);
		    		 } catch (e) {
		    			on_error(e,state);		 
		    		 }
		        });
			} catch(e) {
				on_error(e,state);
			}
		} ).on('error',function(e) {
			on_error(e,state);
		});
	};
	
};






