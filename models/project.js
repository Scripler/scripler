var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , Document
    , User =  require('./user.js').User
    , bcrypt = require('bcrypt')
    , SALT_WORK_FACTOR = 10;

/**
 * User Member Sub-Schema
 */
var ProjectMemberSchema = new Schema({
    userId: { type: String, required: true },
    access: [{ type: String }]
}, { _id: false });

/**
 * Meta TOC Entry Schema
 */
var TOCEntrySchema = new Schema({
    title: { type: String },
    target: { type: String },
    level: {type: Number}
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
    order: { type: Number, default: 0},
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }], // Referencing
    folders: [FolderSchema], // Embedding, since amount of folder meta data is expected to be small.
    members: [ProjectMemberSchema],
    metadata: {
        title:       { type: String },
        description: { type: String },
        keywords:    [ {type: String} ],
        language:    { type: String },
        authors:     [ {type: String} ],
        cover:       { type: String },
        isbn:        { type: String },
        toc:         { entries: [TOCEntrySchema] }
    },
    archived: { type: Boolean, default: false},
    modified: { type: Date, default: Date.now }
});

ProjectSchema.pre('remove', function(next) {
    var projectId = this._id;
    if (Document == undefined) {
        //Lazy loaded because of document<->project cyclic dependency
        Document = require('./document.js').Document
    }

    User.update({"projects": projectId}, {"$pull": {"projects": projectId}}, {multi: true}).exec();

    Document.find({ "projectId": projectId },function(err, documents){
        documents.forEach(function(document){
            document.remove();
        });
    });

    next();
});

exports.Project = mongoose.model('Project', ProjectSchema);
exports.Folder = mongoose.model('Folder', FolderSchema);