var mongoose = require('mongoose')
    , Schema = mongoose.Schema
    , bcrypt = require('bcrypt')
    , SALT_WORK_FACTOR = 10;

/**
 * User DB
 */
var ProjectSchema = new Schema({
    name: { type: String, required: true },
    order: { type: Number},
    modified: { type: Date, default: Date.now }
});

exports.Project = mongoose.model('Project', ProjectSchema);