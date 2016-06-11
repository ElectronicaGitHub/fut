var mongoose = require('../configs/mongoose.js');
var moment = require('moment');
Schema = mongoose.Schema;
ObjectId = Schema.Types.ObjectId;

var MoneySnap = new Schema({
	money : Number,
	created: {
	    type: Date,
	    default: Date.now
	}
});

module.exports = mongoose.model('MoneySnap', MoneySnap);