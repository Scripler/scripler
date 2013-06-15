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


exports.create = function (req, res) {
    var project = new Project({
        // TODO: Add creating user
        name:     req.body.name
    });
    project.save(function (err) {
        if (err) {
            // return error
            res.send({"status": err, "errorMessage": "Database problem"});
        } else {
            res.send({"status": 0});
        }
    });
}
exports.open = function (req, res) {
    Project.findOne({"_id": req.body.id}, function (err, project) {
        if (err) {
            res.send({"status": -err.code, "errorMessage": "Database problem", "errorDetails": err.err});
        } else {
            res.send({"status": 0, project: project});
        }
    });
}
exports.options = function (req, res) {
    Project.findOne({"_id": ObjectId(req.body.id)}, function (err, project) {
        if (err) {
            res.send({"status": -err.code, "errorMessage": "Database problem", "errorDetails": err.err});
        } else {
            res.send({"status": 0, project: project});
        }
    });
}
exports.copy = function (req, res) {
    res.send({"status": 0});
}
exports.rename = function (req, res) {
    res.send({"status": 0});
}
exports.archive = function (req, res) {
    res.send({"status": 0});
}
exports.delete = function (req, res) {
    res.send({"status": 0});
}
