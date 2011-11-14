
var fs = require('fs');
var util = require('util');

var owl = require('./owl_util.js');

console.log( util.inspect(owl) );

// CONFIG START
var myarray =
[
];

files = fs.readdirSync("./applications");

for ( file_index in files ) {
	var module_filename = files[file_index];
	console.log("Loading module from file " + module_filename);
	var module_filename = require( "./applications/" + module_filename );
	myarray = myarray.concat(  module_filename.applications );
}

module.exports.applications = { };
for ( i = 0; i<myarray.length; i++) 
{
	module.exports.applications[ myarray[i].app_id ] = myarray[i];
	module.exports.applications[ myarray[i].app_id ].clone = function(){ return owl.util.copy(this,true);};
}
console.log( module.exports.applications );

