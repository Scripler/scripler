var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, Project // Lazy-loaded, c.f. DocumentSchema.pre()
	, Styleset = require('./styleset.js').Styleset
	, bcrypt = require('bcrypt')
	, SALT_WORK_FACTOR = 10;

/**
 * User-Member schema
 */
var DocumentMemberSchema = new Schema({
	userId: { type: String, required: true },
	access: [
		{ type: String }
	]
}, { _id: false });

/**
 * Document Schema
 */
var DocumentSchema = new Schema({
	name: { type: String },
	text: { type: String },
	projectId: { type: Schema.Types.ObjectId, required: true },
	folderId: { type: Schema.Types.ObjectId },
	members: [DocumentMemberSchema],
	archived: { type: Boolean, default: false},
	deleted: { type: Boolean, default: false},
	type: { type: String, enum: ["cover", "titlepage", "toc", "colophon"] },
	modified: { type: Date, default: Date.now },
	stylesets: [
		{ type: Schema.Types.ObjectId, ref: 'Styleset' }
	],
	defaultStyleset: { type: String },
	deletedStylesets: [
		{ type: Schema.Types.ObjectId, ref: 'Styleset' }
	]
});

DocumentSchema.pre('remove', function (next) {
	// TODO: add log message "WARN: Documents should not be deleted - why is this happening?"

	var documentId = this._id;
	if (Project == undefined) {
		//Lazy loaded because of document<->project cyclic dependency
		Project = require('./project.js').Project;
	}
	//Remove document from any project referencing it as a normal document
	Project.update({"documents": documentId}, {"$pull": {"documents": documentId}}, {multi: true}).exec();
	//, or as a TOC
	Project.update({"metadata.toc": documentId}, {"$unset": {"metadata.toc": 1}}, {multi: true}).exec();
	next();
});

exports.Document = mongoose.model('Document', DocumentSchema);