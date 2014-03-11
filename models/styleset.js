var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, Style = require('./style.js').Style;

/**
 * Styleset-Member schema
 */
var StylesetMemberSchema = new Schema({
	userId: { type: String, required: true },
	access: [
		{ type: String }
	]
}, { _id: false });

/**
 * Styleset Schema
 */
var StylesetSchema = new Schema({
	name: { type: String, required: true },
	styles: [ { type: Schema.Types.ObjectId, ref: 'Style' }],
	members: [StylesetMemberSchema],
	archived: { type: Boolean, default: false}
});

exports.Styleset = mongoose.model('Styleset', StylesetSchema);
