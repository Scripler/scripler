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
 * User Schema
 */
var ProjectSchema = new Schema({
    name: { type: String, required: true },
    order: { type: Number, default: 0},
    members: [ProjectMemberSchema],
    archived: { type: Boolean, default: false},
    modified: { type: Date, default: Date.now }
});

exports.Project = mongoose.model('Project', ProjectSchema);