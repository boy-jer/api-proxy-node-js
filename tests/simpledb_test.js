var config = require('../proxy-config');

var simpledb = require('../lib/storage-drivers/simpledb.js');
simpledb.init( config );

simpledb.setRawData("testnamespace", "testkey3", { attr1: 1, attr2: { inner: "isInnerXXX" } }, function(a){},function(b){} );

simpledb.getRawData("testnamespace", "testkey3", 
    function(a) { 
        console.log(a);
    },
    function(b) {
    } );