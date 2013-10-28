var Project = require('../models/project.js').Project;
var User = require('../models/user.js').User;
var Document = require('../models/document.js').Document;
var utils = require('../lib/utils');

//Load project by id
exports.load = function (id) {
    return function (req, res, next) {
        id = id || req.body.projectId;
        Project.findOne({"_id": id}, function (err, project) {
            if (err) return next(err);
            if (!project) {
                return next({message: "Project not found", status: 404});
            }
            if (!req.user) return next();//Let missing authentication be handled in auth middleware
            if (!utils.hasAccessToEntity(req.user, project)) next(403);
            req.project = project;
            return next();
        });
    }
}

exports.loadPopulated = function (id) {
    return function (req, res, next) {
        id = id || req.body.projectId;
        Project.findOne({"_id": id, "archived": false}).populate('documents', 'name folderId modified archived members').exec(function (err, project) {
            if (err) return next(err);
            if (!project) {
                return next({message: "Project not found", status: 404});
            }
            if (!req.user) return next();//Let missing authentication be handled in auth middleware
            if (!utils.hasAccessToEntity(req.user, project)) next(403);
            req.project = project;
            return next();
        });
    }
}

var list = exports.list = function (req, res, next) {
    User.findOne({"_id": req.user._id}).populate('projects').exec(function (err, user) {
        if (err) {
            return next(err);
        }
        res.send({"projects": user.projects});
    });
};

exports.archived = function (req, res, next) {
    Project.find({"archived": true, "members": {"$elemMatch": {"userId": req.user._id, "access": "admin"}}}, function (err, projects) {
        if (err) {
            return next(err);
        }
        res.send({"projects": projects});
    });
};

exports.create = function (req, res, next) {
    var project = new Project({
        name: req.body.name,
        members: [
            {userId: req.user._id, access: ["admin"]}
        ]
    });
    project.save(function (err) {
        if (err) {
            return next(err);
        }
        req.user.projects.push(project);
        req.user.save(function (err) {
            if (err) {
                return next(err);
            }
            res.send({project: project});
        });
    });
}

exports.open = function (req, res) {
    res.send({ project: req.project});
}

exports.rename = function (req, res, next) {
    var project = req.project;
    project.name = req.body.name;
    project.save(function (err) {
        if (err) {
            return next(err);
        }
        res.send({project: project});
    });
}

exports.archive = function (req, res, next) {
    var project = req.project;
    project.archived = true;
    project.save(function (err) {
        if (err) {
            return next(err);
        }
        User.update({"projects": project._id}, {"$pull": {"projects": project._id}}, {multi: true}, function (err, numberAffected, raw) {
            if (err) {
                return next(err);
            }
            res.send({project: project});
        });
    });
}

exports.unarchive = function (req, res, next) {
    var project = req.project;
    project.archived = false;
    project.save(function (err) {
        if (err) {
            return next(err);
        }
        var membersArray = [];
        for (var i = 0; i < project.members.length; i++) {
            membersArray.push(project.members[i].userId);
        }
        User.update({"_id": {"$in": membersArray}}, {"$addToSet": {"projects": project._id}}, {multi: true}, function (err, numberAffected, raw) {
            if (err) {
                return next(err);
            }
            res.send({project: project});
        });
    });
}

exports.delete = function (req, res, next) {
    var project = req.project;
    project.remove(function (err, result) {
        if (err) {
            return next(err);
        }
        res.send({});
    });
}

exports.copy = function (req, res, next) {
    var project = req.project;

    var newProject = new Project({
        name:     project.name + " - Copy",
        folders:  project.folders,
        members:  project.members,
        metadata: {
            title: project.metadata.title,
            description: project.metadata.description,
            authors: project.metadata.authors,
            language: project.metadata.language,
            isbn:  project.metadata.isbn
        }
    });

    //Add to user (last project in order)
    req.user.projects.push(newProject);
    req.user.save();

    //Copy documents
    var newDocuments = [];
    for (var i = 0; i < project.documents.length; i++) {
        var document = project.documents[i];
        var newDocument = new Document({
            name:      document.name,
            text:      document.text,
            projectId: newProject,
            folderId: document.folderId,
            archived: document.archived,
            members: document.members
        });
        newProject.documents.push(newDocument);
        newDocuments.push(newDocument);
    }
    newProject.save(function (err) {
        if (err) {
            return next(err);
        }
        Document.create(newDocuments, function (err) {
            if (err) {
                return next(err);
            }
            res.send({project: newProject});
        });
    });
}

exports.rearrange = function (req, res) {
    req.user.projects = req.body.projects;
    req.user.save(function (err) {
        if (err) {
            return next(err);
        }
        list(req, res);
    });
}

exports.metadata = function (req, res, next) {
    var project = req.project;
    project.metadata.title = req.body.title;
    project.metadata.description = req.body.description;
    project.metadata.authors = req.body.authors;
    project.metadata.language = req.body.language;
    project.metadata.isbn = req.body.isbn;

    project.save(function (err) {
        if (err) {
            return next(err);
        }
        res.send({project: project});
    });
}

exports.compile = function (req, res) {
    // TODO: implement
}
