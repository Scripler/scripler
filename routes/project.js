var Project = require('../models/project.js').Project;
var User = require('../models/user.js').User;
var utils = require('../lib/utils');

var list = exports.list = function (req, res) {
    User.findOne({"_id": req.user._id}).populate('projects').exec(function (err, user) {
        res.send({"projects": user.projects});
    });
};

exports.archived = function (req, res) {
    Project.find({"archived": true, "members": {"$elemMatch": {"userId": req.user._id, "access": "admin"}}}, function (err, projects) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else {
            res.send({"projects": projects});
        }
    });
};

var create = exports.create = function (req, res) {
    var project = new Project({
        // TODO: Add creating user
        name: req.body.name,
        members: [
            {userId: req.user._id, access: ["admin"]}
        ]
    });
    project.save(function (err) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else {
            req.user.projects.push(project);
            req.user.save(function (err) {
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

exports.open = function (req, res) {
    Project.findOne({"_id": req.params.id, "archived": false}).populate('documents', 'name folderId modified archived members').exec(function (err, project) {
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
                    res.send({"errorMessage": "Database problem"}, 503);
                } else {
                    User.update({"projects": project._id}, {"$pull": {"projects": project._id}}, {multi: true}, function (err, numberAffected, raw) {
                        if (err) {
                            res.send({"errorMessage": "Database problem", "errorDetails": err}, 503);
                        } else {
                            res.send({project: project});
                        }
                    });
                }
            });
        }
    });
}

exports.unarchive = function (req, res) {
    Project.findOne({"_id": req.params.id}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
            project.archived = false;
            project.save(function (err) {
                if (err) {
                    // return error
                    res.send({"errorMessage": "Database problem"}, 503);
                } else {
                    var membersArray = [];
                    for (var i = 0; i < project.members.length; i++) {
                        membersArray.push(project.members[i].userId);
                    }
                    User.update({"_id": {"$in": membersArray}}, {"$addToSet": {"projects": project._id}}, {multi: true}, function (err, numberAffected, raw) {
                        if (err) {
                            res.send({"errorMessage": "Database problem", "errorDetails": err}, 503);
                        } else {
                            res.send({project: project});
                        }
                    });
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
                if (err) {
                    // return error
                    res.send({"errorMessage": "Database problem"}, 503);
                } else {
                    User.update({"projects": req.params.id}, {"$pull": {"projects": req.params.id}}, {multi: true}, function (err, numberAffected, raw) {
                        if (err) {
                            res.send({"errorMessage": "Database problem", "errorDetails": err}, 503);
                        } else {
                            res.send({});
                        }
                    });
                }
            });
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

exports.rearrange = function (req, res) {
    req.user.projects = req.body.projects;
    req.user.save(function (err) {
        if (err) {
            res.send({"errorMessage": "Database problem"}, 503);
        } else {
            list(req, res);
        }
    });
}

exports.compile = function (req, res) {
    // TODO: implement
}
