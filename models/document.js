var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, User = require('./user').User
	, Project // Lazy-loaded, c.f. DocumentSchema.pre('remove')
	, Styleset = require('./styleset').Styleset
	, MemberSchema = require('./member_schema').MemberSchema
	, bcrypt = require('bcrypt')
	, SALT_WORK_FACTOR = 10;

/**
 * Document Schema
 */
var DocumentSchema = new Schema({
	name: { type: String },
	text: { type: String },
	projectId: { type: Schema.Types.ObjectId, required: true },
	folderId: { type: Schema.Types.ObjectId },
	members: [MemberSchema],
	archived: { type: Boolean, default: false},
	deleted: { type: Boolean, default: false},
	type: { type: String, enum: ["cover", "titlepage", "toc", "colophon", "madewithscripler"] },
	modified: { type: Date, default: Date.now },
	stylesets: [
		{ type: Schema.Types.ObjectId, ref: 'Styleset' }
	],
	defaultStyleset: { type: Schema.Types.ObjectId, ref: 'Styleset' },
	deletedStylesets: [
		{ type: Schema.Types.ObjectId, ref: 'Styleset' }
	],
	fonts: [
		{ type: Schema.Types.ObjectId, ref: 'Font' }
	]
});

DocumentSchema.pre('save', function (next) {
	var document = this;

	if (Project == undefined) {
		//Lazy loaded because of document<->project cyclic dependency
		Project = require('./project.js').Project;
	}

	// TODO: can we avoid accessing the database EVERY single time a Document is saved, e.g. by caching the user and only updating "lastActionDate" if the difference between Date.now() and "lastActionDate" is greater than X?
	Project.findOne({"_id": document.projectId}, 'members', function (err, project) {
		if (err) return next(err);
		if (!project.members || project.members.length < 1) return next("ERROR saving document: its project doesn't have any members! (this should not happen)");

		// TODO: change this to id of project "owner" when collaboration is introduced
		var userId = project.members[0].userId;
		User.update({ _id: userId }, { lastActionDate: Date.now() }, next);
	});

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