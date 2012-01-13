/*
 * 
 * track.stores.get
 * 
{
  "message": {
    "header": {
      "status_code": 200,
      "execute_time": 0
    },
    "body": {
    	"store_list": [
    	    { "store": {
		 		"store_name": "itunes",
		 		"store_track": { 
			 		"store_track_url": "url_per_il_buy",
			        "store_track_preview_mp3": "http://..../...mp3"  // puo' non esserci 
			        "store_track_name":  ...
		 		},
		 		"store_album": {
		 			"store_album_url": "url_per_il_buy",
		        	"store_album_name": ...
		 		}, 
		 		"store_artist": {
		 			"store_artist_url": "url_per_il_buy",
		        	"store_artist_name": ...
		 		} 
		    } },
		    [...]
	    ]
    }
  }
} */

util = require("util");
qs = require("querystring");
storage = require( "../lib/storage" );

// http://ax.phobos.apple.com.edgesuite.net/WebObjects/MZStoreServices.woa/wa/wsSearch?term=katy%20perry%20teenage%20dream%20teenage%20dream&country=it&entity=musicTrack&media=music
var iTunesClient = new (require('../lib/simplifiedRequest'))
	.simplifiedRequest( "http://ax.phobos.apple.com.edgesuite.net/WebObjects/MZStoreServices.woa/wa/");

var iTunesStoreRestonse = function( application, itunesResult ) {
	var storeResult = {store: { store_name: "itunes" } };

	storeResult.store.store_track = { 
			store_track_name: itunesResult.trackName,
			store_track_url: application.createTrackingUrl("itunes",itunesResult.country,itunesResult.trackViewUrl),
			store_track_preview: itunesResult.previewUrl,
			store_album_cover100x100: itunesResult.artworkUrl100
	};
	storeResult.store.store_album = { 
			store_album_name: itunesResult.collectionName,
			store_album_url:  application.createTrackingUrl("itunes",itunesResult.country, itunesResult.collectionViewUrl),
			store_album_cover100x100: itunesResult.artworkUrl100
	};

	storeResult.store.store_artist = { 
			store_artist_name: itunesResult.artistName,
			store_artist_url: application.createTrackingUrl("itunes",itunesResult.country, itunesResult.artistViewUrl)
	};
	return storeResult;
};


var config= null;
module.exports.init = function( _config ) {
    config = _config;
};

module.exports.routes =
{
    "/ws/1.1/track.stores.get":  function (request, response, application, urlObj, queryObj, call_usertoken) {
        request.validateToken(application, call_usertoken,
            function(data,state) { 
        		try {
        			application.call("track.get", {track_id: queryObj["track_id"]}, 
        				function(data,state) {
        					/* no searching on itunes */
        					MXMLogger.debug( "Resolved track to: " + util.inspect(data));
        					var terms = data.message.body.track.track_name + " " +
								data.message.body.track.artist_name + " " +
								data.message.body.track.album_name;
        					MXMLogger.debug( "Searching terms: " + terms);

        					var country = queryObj['country'];
        					MXMLogger.debug( "Parameter country code is " + util.inspect(country));
        					if ( typeof(country) == "undefined" ) {
        						country = request.headers["geoip_city_country_code"];
        						MXMLogger.debug( "Header country code " + country);
        					}
        					iTunesClient.get("wsSearch", 
        						{	entity: "musicTrack",
        							media: "music",
        							term: terms, country: country },
        						function(data,state) {
        								storeResult = iTunesStoreRestonse(application, data.results[0] );
        								response.sendPacket( { store_list: [  storeResult  ]} );
        							},
        						function(error,state) { 
        								MXMLogger.debug( "Error contacting itunes to: " + util.inspect(error));
        								response.sendErrorPacket( 404, "" );
        							}
        					);
        				}, function(err,state) {
        					MXMLogger.debug( "Error preparing request to itunes: " + util.inspect(err));
        					response.sendErrorPacket( 404, "" );
        				});

        		} catch(e) {
        			MXMLogger.debug( "Error: " + util.inspect(e));
        			response.sendErrorPacket( 404, "" );
        		}
            },
            function(err,state) {
                response.sendErrorPacket( 401, "not_authorized" );
            }); 
    }
}