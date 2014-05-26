var mongoose = require('mongoose')
	, Schema = mongoose.Schema;

/**
 * Member schema used by all Mongo models.
 */
var MemberSchema = new Schema({
	userId: { type: String, required: true },
	access: [
		{ type: String }
	]
}, { _id: false });

exports.MemberSchema = MemberSchema;