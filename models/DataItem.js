var mongoose = require('../configs/mongoose.js');
var moment = require('moment');
Schema = mongoose.Schema;
ObjectId = Schema.Types.ObjectId;

var DataItem = new Schema({
	assetId : String,
	minPrice : Number,
	averagePrice : Number,
	countOnMarket : Number,
	created : {
		type: Date,	
		default : Date.now
	}
});

module.exports = mongoose.model('DataItem', DataItem);
