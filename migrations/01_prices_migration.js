var Player = require('./../models/player.js');
var async = require('async');
var futapi = require("./../futLib/index.js");

Player.find({}, function (err, results) {
	results = results.filter(function (el) {
		return el.buyPrice == true;
	});
	results.forEach(function (el) {
		el.buyPrice = futapi.calculateValidPrice(el.marketPrices.reduce(function (a, b, c) { return a + b }) / el.marketPrices.length);

		console.log(el.marketPrices, '->', el.buyPrice);
		el.save();
	});
	console.log(results.length);
});
