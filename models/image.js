var mongoose = require('mongoose')
	, Schema = mongoose.Schema;

/**
 * Image-Member schema
 */
var ImageMemberSchema = new Schema({
	userId: { type: String, required: true },
	access: [
		{ type: String }
	]
}, { _id: false });

/**
 * Image Schema
 */
var ImageSchema = new Schema({
	name: { type: String, required: true },
	projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
	members: [ImageMemberSchema],
	fileExtension: { type: String, required: true },
	mediaType: { type: String, required: true },
	url: { type: String, required: true }
});

exports.Image = mongoose.model('Image', ImageSchema);
