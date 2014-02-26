var Document = require('../models/document.js').Document;
var Project = require('../models/project.js').Project;
var utils = require('../lib/utils');
var docConverter = require('../lib/doc-converter');
var path = require('path');
var conf = require('config');

//Load a document by id
exports.load = function (id) {
	return function (req, res, next) {
		id = id || req.body.documentId;
		Document.findOne({"_id": id}, function (err, document) {
			if (err) return next(err);
			if (!document) {
				return next({message: "Document not found", status: 404});
			}
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!utils.hasAccessToEntity(req.user, document)) return next(403);
			req.document = document;
			return next();
		});
	}
}

exports.create = function (req, res, next) {
	var project = req.project;

	var document = new Document({
		name: req.body.name,
		text: req.body.text,
		projectId: project._id,
		folderId: req.body.folderId,
		type: req.body.type,
		members: [
			{userId: req.user._id, access: ["admin"]}
		]
	});

	document.save(function (err) {
		if (err) {
			return next(err);
		}
		project.documents.push(document);
		project.save(function (err, project) {
			if (err) {
				return next(err);
			}
			res.send({document: document});
		});
	});
}

exports.open = function (req, res) {
	res.send({ document: req.document});
}

exports.update = function (req, res, next) {
	var document = req.document;
	document.text = req.body.text;
	document.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({});
	});
}

exports.rename = function (req, res, next) {
	var document = req.document;
	document.name = req.body.name;
	document.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({document: document});
	});
}

exports.archive = function (req, res, next) {
	var document = req.document;
	document.archived = true;
	document.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({});
	});
}

exports.unarchive = function (req, res, next) {
	var document = req.document;
	document.archived = false;
	document.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({document: document});
	});
}

exports.delete = function (req, res, next) {
	var document = req.document;
	document.remove(function (err, result) {
		if (err) {
			return next(err);
		}
		res.send({});
	});
}

exports.rearrange = function (req, res, next) {
	var project = req.project;
	project.documents = req.body.documents;
	project.save(function (err, project) {
		if (err) {
			return next(err);
		}
		res.send({project: project});
	});
}

exports.upload = function (req, res, next) {
	var files = req.files.file;
	// If only a single file was uploaded, *files* is not an array.
	// In that case, we make it an array, to handle single- ang multi-fileuploads the same way.
	if (!(files instanceof Array)) {
		files = [files];
	}
	var completedFiles = 0;
	var importedHtml = '';
	// TODO: use actual user when editor is available in real test-setup
	var user = 'test';
	var userDir = path.join(conf.resources.usersDir, user);
	var userUrl = conf.resources.usersUrl + '/' + user;
	for (var i = 0; i < files.length; i++) {
		var file = files[i];
		console.log('Uploaded file ' + file.name + ' to ' + file.path + ' (' + file.size + ')');
		docConverter.execute(userDir, file.path, function (err, html) {
			if (err) {
				return next(new Error(err));
			}
			completedFiles++;
			importedHtml = importedHtml + html;
			if (completedFiles == files.length) {
				// All file imported
				// Update all img links to match the upload location
				res.send(importedHtml.replace(/(<img[^>]*src=")([^"]+")/g, '$1' + userUrl + '/$2'));
			}
		});
	}
}

