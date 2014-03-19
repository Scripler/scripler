var mongoose = require('mongoose')
	, Schema = mongoose.Schema;

/**
 * Style-Member schema
 */
var StyleMemberSchema = new Schema({
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
	stylesetId: { type: Schema.Types.ObjectId, required: true },
	members: [StyleMemberSchema],
	archived: { type: Boolean, default: false},
	deleted: { type: Boolean, default: false}
});

exports.Style = mongoose.model('Style', StyleSchema);
