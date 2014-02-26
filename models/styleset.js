var mongoose = require('mongoose')
	, Schema = mongoose.Schema;

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
 * Style Schema
 */
var StyleSchema = new Schema({
	name: { type: String, required: true },
	class: { type: String },
	css: { type: String },
	stylesetId: { type: Schema.Types.ObjectId, required: true }
});

/**
 * Styleset Schema
 */
var StylesetSchema = new Schema({
	name: { type: String, required: true },
	styles: [ { type: Schema.Types.ObjectId, ref: 'StyleSchema' }],
	members: [StylesetMemberSchema]
});

exports.Styleset = mongoose.model('Styleset', StylesetSchema);
exports.Style = mongoose.model('Style', StyleSchema);
