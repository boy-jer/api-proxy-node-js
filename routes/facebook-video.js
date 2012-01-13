util = require("util");
http = require("http")
storage = require( "../lib/storage" );

var config= null;
module.exports.init = function( _config ) {
    config = _config;
};
module.exports.routes =
{
    "/ws/1.1/video.subtitle.dfxp.get":  function (request, response, application, urlObj, queryObj, call_usertoken) {
        request.validateToken(application, call_usertoken,
            function(data,state) {
              response.setHeader("Content-Type", "text/plain; charset=utf-8");
              video_id = queryObj["video_id"];
              
              var options = {
                host: config.api_host,
                port: config.api_port,
                path: '/ws/1.1/video.subtitle.get?apikey=' + application.apikey +'&format=json&subtitle_format=dfxp&video_id=' + video_id
              };
              request = http.get(options);
              data = "";
              request.on('response', function (res) {
                res.on('data', function (chunk) {
                  data = data + chunk;
                });
                res.on('end', function () {
                  subtitle = JSON.parse(data).message.body.subtitle;
                  pixel_tracking_url = subtitle.pixel_tracking_url;
                  tracking = " <tracking>" + pixel_tracking_url + "</tracking>\n"
                  subtitle = subtitle.subtitle_body;
                  subtitle = [subtitle.slice(0, 147), tracking, subtitle.slice(147)].join('');
                  response.write(subtitle);
                  response.end();
                });
              });
              
            },
            function(err,state) {
                response.sendErrorPacket( 401, "renew" );
            });
    }
}