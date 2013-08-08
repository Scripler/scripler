var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , bcrypt = require('bcrypt')
    , SALT_WORK_FACTOR = 10;

/**
 * User Member Sub-Schema
 */
var ProjectMemberSchema = new Schema({
    userId: { type: String, required: true },
    access: [{ type: String }]
});

/**
 * Folder Schema, recursive, see https://groups.google.com/forum/#!topic/mongoose-orm/0yUVXNyprx8
 * 
 */
var FolderSchema = new Schema();
FolderSchema.add({
	name: { type: String },	
	folders: [FolderSchema], 
});

var ProjectSchema = new Schema({
    name: { type: String, required: true },
    order: { type: Number, default: 0},
    //documents: [{document: { type: Schema.Types.ObjectId, ref: 'Document' }, order: {type: Number}}], // Referencing
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }], // Referencing
    folders: [FolderSchema], // Embedding, since amount of folder meta data is expected to be small.
    members: [ProjectMemberSchema],
    archived: { type: Boolean, default: false},
    modified: { type: Date, default: Date.now }
});

exports.Project = mongoose.model('Project', ProjectSchema);
exports.Folder = mongoose.model('Folder', FolderSchema);