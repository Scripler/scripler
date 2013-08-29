var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , Project = require('./project.js').Project
    , bcrypt = require('bcrypt')
    , SALT_WORK_FACTOR = 10;

/**
 * User-Member schema
 */
var DocumentMemberSchema = new Schema({
    userId: { type: String, required: true },
    access: [{ type: String }]
});

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
    modified: { type: Date, default: Date.now }
});


DocumentSchema.pre('remove', function(next) {
    var documentId = this._id;
    Project.update({"documents": documentId}, {"$pull": {"documents": documentId}}, {multi: true});
    next();
});

exports.Document = mongoose.model('Document', DocumentSchema);