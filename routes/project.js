var Project = require('../models/project.js').Project;

// Project helper functions

/**
 * Does the user have access to the project?
 */
function hasAccessToProject(user, project, access) {
    access = access || "admin";
    var memberObj = getEmbeddedDocument(project.members, "userId", user._id.toString()) || {};
    var accessArray = memberObj.access || [];
    return accessArray.indexOf(access) >= 0;
}

function getEmbeddedDocument(arr, queryField, search) {
    var len = arr.length;
    while (len--) {
        if (arr[len][queryField] === search) {
            return arr[len];
        }
    }
}


/**
 * GET projects listing.
 */

exports.list = function (req, res) {
    Project.find({}, function (err, docs) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 400);
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
            res.send({"errorMessage": "Database problem"}, 400);
        } else {
            res.send({project: project});
        }
    });
}
exports.open = function (req, res) {
    Project.findOne({"_id": req.params.id}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 400);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!hasAccessToProject(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
            res.send({ project: project});
        }
    });
}
exports.options = function (req, res) {
    Project.findOne({"_id": req.params.id}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 400);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!hasAccessToProject(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
            res.send({project: project});
        }
    });
}
exports.copy = function (req, res) {
    Project.findOne({"_id": req.params.id}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 400);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!hasAccessToProject(req.user, project)) {
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
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 400);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!hasAccessToProject(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
            project.name = req.body.name;
            project.save(function (err) {
                if (err) {
                    // return error
                    res.send({"errorMessage": "Database problem"}, 400);
                } else {
                    res.send({project: project});
                }
            });
        }
    });
}
exports.archive = function (req, res) {
    Project.update({ _id: req.params.id, "members": {"$elemMatch": {"userId": req.user._id, "access": "admin"}} }, { archived: true }, function (err, numberAffected, raw) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 400);
        } else {
            res.send({"affected": numberAffected});
        }
    });
}
exports.delete = function (req, res) {
    Project.findOne({"_id": req.params.id}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 400);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!hasAccessToProject(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
            project.remove(function (err, result) {
                res.send({});
            });
        }
    });


}
