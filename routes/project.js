var Project = require('../models/project.js').Project;

/**
 * GET projects listing.
 */

exports.list = function (req, res) {
    Project.find({}, function (err, docs) {
        if (err) {
            res.send({"status": -err.code, "errorMessage": "Database problem", "errorDetails": err.err});
        } else {
            res.send({"status": 0, "projects": docs});
        }
    });
};
