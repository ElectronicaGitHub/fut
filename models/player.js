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
	// показатель количества на рынке игрока с текущим assetId и rare
	quantityOnMarket : Number,
	stats : {
		type : String,
		set : function (val) {
			return JSON.stringify(val);
		},
		get : function (string) {
			if (!string) return null;
			return JSON.parse(string);
		}
	},
	strategyType : String,
	// ключ отображающий покупку двух игроков одновременно
	position : String,
	created: {
	    type: Date,
	    default: Date.now
	}
});

Player.virtual('revenue').get(function() { return this.sellPrice - this.buyPrice * 1.0555; });
Player.virtual('timeDiff').get(function() {
	if (this.soldTime && this.created) {
		var a = moment(this.soldTime);
		var b = moment(this.created);

		var d = a.diff(b, 'hours');

		return d;
	} else return null;
});

Player.set('toObject', { getters: true });
Player.set('toJSON', { getters: true });

module.exports = mongoose.model('Player', Player);
