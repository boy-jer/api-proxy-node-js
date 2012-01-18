
var simpledb = require('simpledb');
var nMemcached = require('memcached');
var knox = require('knox');

var config = null;

module.exports.init = function( _config ) {
    config = _config;
};

module.exports.getRawData = function( namespace, key, on_ok, on_error,state ) {
    var m_conn =  new simpledb.SimpleDB({keyid:config.simpledb.keyid,secret:config.simpledb.secret});

    m_conn.getItem( config.simpledb.domains_prefix + namespace, key, function (err, result) {
        if (err || result == 0 || result ==null) {
            if (on_error)
                on_error( err,state );
        }
        else {
            if (on_ok)
                on_ok( deflattenData(result),state);
            //if ( refresh == true ) {
            //    setRawData(namespace, key, result, function(a){}, function(b){});
            //}
        }
    });
};

module.exports.setRawData = function (namespace, key, data, on_ok, on_error,state ) {
    var m_conn =  new simpledb.SimpleDB({keyid:config.simpledb.keyid,secret:config.simpledb.secret});
    if ( data.clone ) data = data.clone();
    else data = JSON.parse(JSON.stringify(data));
    
    data.last_updated = new Date();
    m_conn.createDomain( config.simpledb.domains_prefix + namespace, function (error) {
        m_conn.putItem(config.simpledb.domains_prefix + namespace, key, flattenData( data ), config.memcache_memorize_time, function (err) {
        	if ( err ) 
        	{
        		if (on_error)
        			on_error( err,state );        		
        	}
        	else 
        	{ 
        		if (on_ok)
        			on_ok( data,state );
        	}
        });
    });
};

module.exports.setRawBlob = function(namespace, key, data, on_ok, on_error, state) {
	var m_conn = knox.createClient({
		key : config.s3.keyid,
		secret : config.s3.secret,
		bucket: config.s3.bucket
	});

	var req = m_conn.put('/' + namespace + '/' + key, {
		'Content-Length' : data.length,
		'Content-Type' : 'application/octet-stream'
	});

	req.on('response', function(res) {
		if (200 != res.statusCode) {
			MXMLogger.debug("error wrinting a blob" );
			if (on_error)
				on_error(res, state);
		} else {
			MXMLogger.debug("blob successfully written");
			if (on_ok)
				on_ok(data, state);
		}
	});
	MXMLogger.debug("writing a blob");
	req.end(data,"binary");
};

module.exports.getRawBlob = function( namespace, key, on_ok, on_error,state ) {
	var m_conn = knox.createClient({
		key : config.s3.keyid,
		secret : config.s3.secret,
		bucket: config.s3.bucket
	});

	var m_conn = knox.createClient({
		key : config.s3.keyid,
		secret : config.s3.secret,
		bucket : config.s3.bucket
	});

	m_conn.get('/' + namespace + '/' + key).on('response', function(res) {
		MXMLogger.debug(util.inspect(res.statusCode));
		MXMLogger.debug(util.inspect(res.headers));
		res.setEncoding('binary');

		var MXMBodyTemp = null;
		res.on('data', function(chunk) {
			if (MXMBodyTemp != null)
				MXMBodyTemp += chunk;
			else
				MXMBodyTemp = chunk;
		});
		res.on('end', function() {
			MXMLogger.debug("end");
			if (on_ok)
				on_ok(MXMBodyTemp, state);
		});
		res.on('error', function(err) {
			if (on_error)
				on_error(err, state);
		});
	}).end();
};

function flattenData( data ) {
    for ( var k in data ) {
    	if ( (k + "") != "" ) {
    		if (typeof(data[k])!="string" &&
				typeof(data[k])!="number" &&
				typeof(data[k])!="boolean" ) 
    			data[k] = JSON.stringify(data[k]);
    	}
    	else
    		delete data[k];
    }
    return data;
}

function deflattenData( data ) {
    for ( var k in data ) {
    	if ( (k + "") != "" ) {
	        try {
	            data[k]=JSON.parse(data[k]);
	        } catch(e) 
	        {
	        };
    	}
    	else
    		delete data[k];
    }
    return data;
}

/*
Docs here:
https://github.com/rjrodger/simpledb

var simpledb = require('simpledb')
var sdb      = new simpledb.SimpleDB({keyid:'YOUR_AWS_KEY_ID',secret:'YOUR_AWS_SECRET_KEY'})

sdb.createDomain( 'yourdomain', function( error ) {

  sdb.putItem('yourdomain', 'item1', {attr1:'one', attr2:'two'}, function( error ) {

    sdb.getItem('yourdomain', 'item1', function( error, result ) {
      console.log( 'attr1 = '+result.attr1 )
      console.log( 'attr2 = '+result.attr2 )
    })
  })
})

*/