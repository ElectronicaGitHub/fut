var mongoose = require('../configs/mongoose.js');
var moment = require('moment');
Schema = mongoose.Schema;
ObjectId = Schema.Types.ObjectId;

var DataStorage = new Schema({
	data : {
		type : String,
		set : function (val) {
			return JSON.stringify(val);
		},
		get : function (string) {
			return JSON.parse(string);
		}
	},
	created: {
	    type: Date,
	    default: Date.now
	}
});

DataStorage.set('toObject', { getters: true });
DataStorage.set('toJSON', { getters: true });

module.exports = mongoose.model('DataStorage', DataStorage);
