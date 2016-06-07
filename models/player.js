var mongoose = require('../configs/mongoose.js');
var moment = require('moment');
Schema = mongoose.Schema;
ObjectId = Schema.Types.ObjectId;

var Player = new Schema({
	cardId : String,
	assetId : String,
	tradeId : String,
	rating : Number,
	rare : Number,
	sold : {
		type : Boolean,
		default : false
	},
	buyPrice : Number,
	sellPrice : String,
	marketPrices : [Number],
	soldTime : {
		type : Date
	},
	created: {
	    type: Date,
	    default: Date.now
	}
});

Player.virtual('revenue').get(function() { return this.sellPrice - this.buyPrice; });
Player.virtual('timeDiff').get(function() { 
	var a = moment(this.soldTime);
	var b = moment(this.created);

	var d = a.diff(b, 'hours');

	return d;
});

module.exports = mongoose.model('Player', Player);
