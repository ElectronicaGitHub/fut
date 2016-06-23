var Player = require('./../models/player.js');
var DataStorage = require('./../models/DataStorage.js');
var async = require('async');
var futapi = require("./../futLib/index.js");

var d = new DataStorage({ data : {} });
d.save(function (err, ok) {
	console.log('DataStorage successfully created!');
});

