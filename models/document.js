var mongoose = require('mongoose')
    , Schema = mongoose.Schema
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
    projectId: { type: String, required: true }, 
	members: [DocumentMemberSchema],
    archived: { type: Boolean, default: false},
    modified: { type: Date, default: Date.now }
});

exports.Document = mongoose.model('Document', DocumentSchema);