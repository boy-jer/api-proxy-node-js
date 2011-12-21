util = require("util");

var storage = require( "../lib/storage" );

var config= null;
module.exports.init = function( _config ) {
    config = _config;
    storage.init(config);
};

var generateUserToken = function (application, on_ok, on_error,status ) {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    var token = S4() + S4() + S4() + S4() + S4() + S4();
    token += S4() + S4() + S4() + S4() + S4() + S4();

    storage.setAppData( "tokens", application, token, application , on_ok, on_error,status);
    return token;
};

module.exports.routes =
{
    "/ws/1.1/token.get": function (request, response, application, urlObj, queryObj, call_usertoken) {
        
        // if there is a receipt validation function
        var modified_application = application;
        try {
            if (application.receipt_validate)
                modified_application = application.receipt_validate(queryObj["receipt"]);
        } catch (e) { MXMLogger.debug("exception " + util.inspect(e)); }
        
        on_ok = function(data,state ) {
            MXMLogger.debug("Checking if token " + state.token + " is readable" );
            storage.getAppData( "tokens", state.application, state.token, function(a)
            { 
                MXMLogger.debug("Token " + state.token + " is readable at try " + state._try );
                state.response.writeHeader(200, {
                    'Content-Length': state.token_msg.length,
                    'Content-Type': 'text/plain; charset=utf-8',
                    'x-mxm-cache': 'no-cache'
                });
                state.response.write(state.token_msg);
                state.response.end();
            }, function () {
                state._try++;
                if (state._try<3) {
                    setTimeout( function() {
                        status.on_ok(data,state);
                    }, 500 );
                } else {
                    response.sendErrorPacket( 500, "" );  
                }
            },state);
        };
        var status = new Object();
        status.on_ok = on_ok;
        status.application = application;
        status.response= response;
        status.token = generateUserToken(application, on_ok, null, status);
        status._try = 0;

        status.token_msg = '{"message":{"header":{"status_code":200,"execute_time":0},"body":{"user_token":"' +
			 status.token + '" , \"app_config\": ' + JSON.stringify(modified_application.app_config) + ' }}}';
    }
    /*
	, "/captcha": function (request, response, application, urlObj, queryObj, call_usertoken) {
        // if there is a receipt validation function
        var modified_application = application;
        try {
            if (application.receipt_validate)
                modified_application = application.receipt_validate(queryObj["receipt"]);
        } catch (e) { console.log("exception " + e); }

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
                    if (res.is_valid) {
                        var token_msg = '{"message":{"header":{"status_code":200,"execute_time":0},"body":{"user_token":"' + generateUserToken(modified_application) + '"}}}';
                        response.write(token_msg);
                        response.end();
                    } else {
                        html = recaptcha.getCaptchaHtml(application.recaptcha.public_key, res.error);
                        response.write('<html><body><form action="" method="post">' + html + "</form></body></html>");
                        response.end();
                    }
                });

                recaptcha.checkAnswer(application.recaptcha.private_key,
						request.connection.remoteAddress,
						POST["recaptcha_challenge_field"],
						POST["recaptcha_response_field"]);
            });
        } else {
            var html = recaptcha.getCaptchaHtml(application.recaptcha.public_key, "");
            response.write('<html><body><form action="" method="post">' + html + "</form></body></html>");
            response.end();
        }
    }*/
};