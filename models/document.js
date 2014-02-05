var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , Project
    , bcrypt = require('bcrypt')
    , SALT_WORK_FACTOR = 10;

/**
 * User-Member schema
 */
var DocumentMemberSchema = new Schema({
    userId: { type: String, required: true },
    access: [{ type: String }]
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
    type: { type: String, enum: ["cover", "titlepage", "toc", "colophon"] },
    modified: { type: Date, default: Date.now }
});

DocumentSchema.pre('remove', function(next) {
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