var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, MemberSchema = require('./member_schema').MemberSchema;

/**
 * Font Schema
 */
var FontSchema = new Schema({
	// (family, style, weight) is the key
	family: { type: String, required: true },
	style: { type: String, required: true },
	weight: { type: Number, required: true },
	// src is the value
	src: { type: String, required: true },
	documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
	members: [MemberSchema], // Currently not used but will be used when user's can upload their own fonts
	archived: { type: Boolean, default: false},
	deleted: { type: Boolean, default: false},
	isSystem: { type: Boolean, default: false }
});

exports.Font = mongoose.model('Font', FontSchema);