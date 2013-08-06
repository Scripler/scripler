var Project = require('../models/project.js').Project;
var utils = require('../lib/utils');

/**
 * GET projects listing.
 */

exports.list = function (req, res) {
    Project.find({}, function (err, docs) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else {
            res.send({"projects": docs});
        }
    });
};


var create = exports.create = function (req, res) {
    var project = new Project({
        // TODO: Add creating user
        name:    req.body.name,
        members: [
            {userId: req.user._id, access: ["admin"]}
        ]
    });
    project.save(function (err) {
        if (err) {
            // return error
            //res.send({"errorMessage": "Database problem"}, 400);
			res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else {
            res.send({project: project});
        }
    });
}
exports.open = function (req, res) {
    Project.findOne({"_id": req.params.id}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
            res.send({ project: project});
        }
    });
}
exports.options = function (req, res) {
    Project.findOne({"_id": req.params.id}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
            res.send({project: project});
        }
    });
}
exports.copy = function (req, res) {
    Project.findOne({"_id": req.params.id}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
            var newReq = req;
            req.body.name = project.name + " - Copy";
            create(newReq, res);
        }
    });
}
exports.rename = function (req, res) {
    Project.findOne({"_id": req.params.id}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
            project.name = req.body.name;
            project.save(function (err) {
                if (err) {
                    // return error
                    res.send({"errorMessage": "Database problem"}, 503);
                } else {
                    res.send({project: project});
                }
            });
        }
    });
}
exports.archive = function (req, res) {
    Project.findOne({"_id": req.params.id}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
            project.archived = true;
            project.save(function (err) {
                if (err) {
                    // return error
                    res.send({"errorMessage": "Database problem"}, 503);
                } else {
                    res.send({project: project});
                }
            });
        }
    });
}
exports.delete = function (req, res) {
    Project.findOne({"_id": req.params.id}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
            project.remove(function (err, result) {
                res.send({});
            });
        }
    });


}
