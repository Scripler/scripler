var Document = require('../models/document.js').Document;
var Project = require('../models/project.js').Project;
var utils = require('../lib/utils');

exports.create = function (req, res) {
	// Does a project exist for the document?
	Project.findOne({"_id": req.body.projectId}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else { // Yes, create the document
            var document = new Document({
                // TODO: Add creating user
                name:      req.body.name,
                text:      req.body.text,
                projectId: req.body.projectId,
                folderId: req.body.folderId,
                members: [
                    {userId: req.user._id, access: ["admin"]}
                ]
            });
            
            document.save(function (err) {
                if (err) {
                    // return error
                	res.send({
        				"errorCode": err.code,
        				"errorMessage": "Database problem",
        				"errorDetails": err.err
        			}, 503);
                } else {
                	project.documents.push(document);
                	project.save(function (err, project) {
                		if (err) {
                			res.send({
                				"errorCode": err.code,
                				"errorMessage": "Database problem",
                				"errorDetails": err.err
                			}, 503);
                		} else {
                			res.send({document: document});
                		}
                	});
                }
            });        	
        }
	});
}

exports.open = function (req, res) {
    Document.findOne({"_id": req.params.id}, function (err, document) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!document) {
            res.send({"errorMessage": "Document not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, document)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
        	res.send({ document: document});
        }
    });
}

exports.rename = function (req, res) {
    Document.findOne({"_id": req.params.id}, function (err, document) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!document) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, document)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
        	document.name = req.body.name;
        	document.save(function (err) {
                if (err) {
                    // return error
                    res.send({"errorMessage": "Database problem"}, 503);
                } else {
                    res.send({document: document});
                }
            });
        }
    });
}

exports.archive = function (req, res) {
    Document.findOne({"_id": req.params.id}, function (err, document) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!document) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, document)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
        	document.archived = true;
        	document.save(function (err) {
                if (err) {
                    // return error
                    res.send({"errorMessage": "Database problem"}, 503);
                } else {
                    res.send({document: document});
                }
            });
        }
    });
}

exports.unarchive = function (req, res) {
    // TODO: implement
}

exports.delete = function (req, res) {
    Document.findOne({"_id": req.params.id}, function (err, document) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!document) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, document)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
        	document.remove(function (err, result) {
                res.send({});
            });
        }
    });
}
