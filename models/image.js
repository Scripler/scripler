var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, MemberSchema = require('./member_schema').MemberSchema;

/**
 * Image Schema
 */
var ImageSchema = new Schema({
	name: { type: String, required: true },
	projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
	members: [MemberSchema],
	fileExtension: { type: String, required: true },
	mediaType: { type: String, required: true }
});

exports.Image = mongoose.model('Image', ImageSchema);
