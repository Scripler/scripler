var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var IdSchema = new Schema({
	id: { type: String, required: true },
	seq: { type: Number, required: true }
});


exports.Id = mongoose.model('Id', IdSchema);