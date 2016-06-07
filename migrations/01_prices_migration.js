var Player = require('./../models/player.js');
var async = require('async');
var futapi = require("./../futLib/index.js");

Player.find({}, function (err, results) {
	results = results.filter(function (el) {
		return el.buyPrice == true;
	});
	results.forEach(function (el) {
		el.buyPrice = el.sellPrice - 300;
		el.save();
	});
	console.log(results.length);
});
