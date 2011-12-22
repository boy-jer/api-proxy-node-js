util = require("util");

var storage = require( "../lib/storage" );

var config= null;
module.exports.init = function( _config ) {
    config = _config;
    storage.init(config);
};

/* 
  Facebook profile data:
          "profile": {
            "id": "567146063",
            "name": "Francesco Delfino",
            "first_name": "Francesco",
            "last_name": "Delfino",
            "link": "http://www.facebook.com/francesco.delfino",
            "username": "francesco.delfino",
            "gender": "male",
            "email": "blablabla@gmail.com",
            "timezone": 1,
            "locale": "it_IT",
            "verified": true,
            "updated_time": "2011-12-16T10:48:00+0000"
 */

module.exports.routes =
{
	    "/ws/1.1/credential.post":  function (request, response, application, urlObj, queryObj, call_usertoken) { 
	        request.validateToken(application, call_usertoken,
	            function(data,state) {
	        	    /* example object: 
	        	     *   fb - facebook
	        	     *   g2 - google oauth2
	        	     *   lv - windows live
	        	     *   tw - twitter oauth
	        	     *   
	        	     { 
						credential_list: [ 
	        	     		{ credential: { type: fb|g2|lv|tw , application: .., auth_token: .. , code: .., refresh_token: .. } },
	        	     		{ credential: { .. } },
	        	     		{ credential: { .. } }
	        	     	]  
	        	     } 
	        		*/
	                //read from the post the json document to save
	        		var body = "";
	                if (request.method == 'POST') {
	                    body = request.MXMBody;
	                }
	                else
	                	body = queryObj.credential_list;

                	try { 
                        var POST = JSON.parse(body);
                        MXMLogger.debug("Parsed credential list " + util.inspect( POST.credential_list ));
                        var processed = 0;
                        
                        var context = new credentialContext( );
                        
                        context.credential_list = POST.credential_list;
                        context.response = response;
                        context.token = call_usertoken;
                        context.application = application;
                        context.tokenContent = data;
                        context.length = context.credential_list.length;
                        
                        for( var i in POST.credential_list ) 
                        {
                        	MXMLogger.debug("Processing index: " + i);
                        	var credential = context.credential_list[i].credential;
                        	MXMLogger.debug("Processing " + util.inspect( credential ) + " of type " + credential.type);
                        	switch( credential.type ) {
                        		case 'fb':
                        			checkFacebookToken(credential.application,  credential.auth_token, 
                        					function(profile,current_credential) { 
                        						processed++;
                        						profile.user_id = "fb:" + profile.id;
                        						current_credential.account = profile;
                        						current_credential.error = null;
                        						if ( processed == context.length)
                        							context.saveAccountsInToken();
                        					},
                        					function(err,current_credential) {
                        						processed++;
                        						current_credential.account = null;
                        						current_credential.error = err.error;
                        						if ( processed == context.length)
                        							context.saveAccountsInToken();
                        					},
                        					credential
                        			);
                        			break;
                        		default:
                        			credential.account = null;
                        			credential.error = { type: "UnrecognizedAccountType", messsage: "" };
                        			processed++;
            						if ( processed == context.length)
            							context.saveAccountsInToken();
                        			credential.processed = true;
                        			break;
                        	}
                        }
                	} catch(e) {
                		MXMLogger.debug("Error: " + util.inspect(e) );
                        response.sendErrorPacket( 401, "incorrect_format" );
                	}
	            },
	            function(err,state) {
	                response.sendErrorPacket( 401, "renew" );  
	            });
	    }
};

var credentialContext = function() {
	this.credential_list = null;
	this.response = null;
	this.token = null;
	this.tokenContent = null;
	this.length = 0;
	this.application = null;
	
	this.saveAccountsInToken = function() {
		this.tokenContent.accounts = [];
		for (var i =0; i<this.length; i++) {
			this.tokenContent.accounts[i] = this.credential_list[i].credential.account;
		}
		storage.setAppData("tokens", this.application, this.token, this.tokenContent , 
				function(data,context ) {
					context.response.sendPacket( context.credential_list );
				},
				function(err,context) {
					context.response.sendErrorPacket( 401, "renew");
				},this);
	}; 
	return this;
};
