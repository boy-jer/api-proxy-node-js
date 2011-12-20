
var simpledb = require('simpledb');
var nMemcached = require('memcached');

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
            if (on_error)
                on_ok( deflattenData(result),state);
            //if ( refresh == true ) {
            //    setRawData(namespace, key, result, function(a){}, function(b){});
            //}
        }
    });
}

module.exports.setRawData = function (namespace, key, data, on_ok, on_error,state ) {
    var m_conn =  new simpledb.SimpleDB({keyid:config.simpledb.keyid,secret:config.simpledb.secret});
    data.last_updated = new Date();
    m_conn.createDomain( config.simpledb.domains_prefix + namespace, function (error) {
        m_conn.putItem(config.simpledb.domains_prefix + namespace, key, flattenData( data.clone() ), config.memcache_memorize_time, function (err) {
            //TODO error logging
            if (on_ok)
                on_ok( data,state );
        });
    });
}

function flattenData( data ) {
    for ( var k in data ) {
        data[k] = JSON.stringify(data[k]);
    }
    return data;
}

function deflattenData( data ) {
    for ( var k in data ) {
        try {
            data[k] =JSON.parse(data[k]);
        } catch(e) 
        {
        };
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