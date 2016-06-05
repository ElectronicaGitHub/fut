var mongoose = require('../configs/mongoose.js');
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
	created: {
	    type: Date,
	    default: Date.now
	}
});

Player.virtual('revenue').get(function() { console.log(this);return this.sellPrice - this.buyPrice; });

module.exports = mongoose.model('Player', Player);
