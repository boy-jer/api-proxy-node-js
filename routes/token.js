util = require("util");

var storage = require( "../lib/storage" );

var config= null;
module.exports.init = function( _config ) {
    config = _config;
    storage.init(config);
};

var generateUserToken = function (application, on_ok, on_error ) {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    var token = S4() + S4() + S4() + S4() + S4() + S4();

    storage.setAppData( "tokens", application, token, application , on_ok, on_error);
    return token;
}

module.exports.routes =
{
    "/ws/1.1/token.get": function (request, response, application, urlObj, queryObj, call_usertoken) {
        
        // if there is a receipt validation function
        var modified_application = application;
        try {
            if (application.receipt_validate)
                modified_application = application.receipt_validate(queryObj["receipt"]);
        } catch (e) { console.log("exception " + e); }

        var on_ok = function(data ) {
            setTimeout( function() {
                response.writeHeader(200, {
                    'Content-Length': token_msg.length,
                    'Content-Type': 'text/plain; charset=utf-8',
                    'x-mxm-cache': 'no-cache'
                });
                response.write(token_msg);
                response.end();
                }, 3000 );
        }

        var token_msg = '{"message":{"header":{"status_code":200,"execute_time":0},"body":{"user_token":"' +
			generateUserToken(application, on_ok, on_ok) + '" , \"app_config\": ' + JSON.stringify(modified_application.app_config) + ' }}}';
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