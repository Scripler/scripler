var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, Document // Lazy-loaded, c.f. ProjectSchema.pre()
	, User = require('./user').User
	, Styleset = require('./styleset').Styleset
	, bcrypt = require('bcrypt')
	, MemberSchema = require('./member_schema').MemberSchema
	, SALT_WORK_FACTOR = 10;

/**
 * Meta TOC Entry Schema
 */
var TOCEntrySchema = new Schema({
	id: { type: String },
	type: { type: String },
	level: { type: Number },
	target: { type: String },
	text: { type: String }
}, { _id: false });

/**
 * Folder Schema, recursive, see https://groups.google.com/forum/#!topic/mongoose-orm/0yUVXNyprx8
 *
 */
var FolderSchema = new Schema();
FolderSchema.add({
	name: { type: String },
	archived: { type: Boolean, default: false },
	folders: [FolderSchema]
});

var ProjectSchema = new Schema({
	name: { type: String, required: true },
	documents: [
		{ type: Schema.Types.ObjectId, ref: 'Document' }
	], // Referencing
	deletedDocuments: [
		{ type: Schema.Types.ObjectId, ref: 'Document' }
	],
	styleset: { type: Schema.Types.ObjectId, ref: 'Styleset' }, // The default styleset for new documents in this project
	folders: [FolderSchema], // Embedding, since amount of folder meta data is expected to be small.
	members: [MemberSchema],
	metadata: {
		title: { type: String },
		description: { type: String },
		keywords: [
			{type: String}
		],
		language: { type: String },
		authors: [
			{type: String}
		],
		cover: { type: String },
		isbn: { type: String },
		rights: { type: String },
		contributors: [
			{
				role: { type: String },
				name: { type: String }
			}
		],
		publisher: { type: String },
		coverage: { type: String },
		publicationDate: { type: Date },
		type: { type: String },
		relation: { type: String },
		source: { type: String },
		toc: { entries: [TOCEntrySchema] }
	},
	archived: { type: Boolean, default: false},
	deleted: { type: Boolean, default: false},
	created: { type: Date, default: Date.now },
	modified: { type: Date, default: Date.now },
	images: [
		{ type: Schema.Types.ObjectId, ref: 'Image' }
	]
});

ProjectSchema.pre('remove', function (next) {
	// TODO: add log message "WARN: Projects should not be removed - why is this happening?"

	var projectId = this._id;
	if (Document == undefined) {
		//Lazy loaded because of document<->project cyclic dependency
		Document = require('./document.js').Document
	}

	User.update({"projects": projectId}, {"$pull": {"projects": projectId}}, {multi: true}).exec();

	Document.find({ "projectId": projectId }, function (err, documents) {
		documents.forEach(function (document) {
			document.remove();
		});
	});

	next();
});

exports.Project = mongoose.model('Project', ProjectSchema);
exports.Folder = mongoose.model('Folder', FolderSchema);
exports.TOCEntry = mongoose.model('TOCEntry', TOCEntrySchema);
