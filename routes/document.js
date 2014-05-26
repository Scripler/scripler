var Document = require('../models/document.js').Document;
var Project = require('../models/project.js').Project;
var Styleset = require('../models/styleset.js').Styleset;
var copyStyleset = require('../models/styleset.js').copy;
var utils_shared = require('../public/create/scripts/utils-shared');
var utils = require('../lib/utils');
var docConverter = require('../lib/doc-converter');
var path = require('path');
var async = require('async');
var conf = require('config');
var logger = require('../lib/logger');

//Load a document by id
exports.load = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.documentId;
		Document.findOne({"_id": idCopy, "deleted": false}, function (err, document) {
			if (err) return next(err);
			if (!document) {
				return next({message: "Document not found", status: 404});
			}
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!utils.hasAccessToModel(req.user, document)) return next(403);
			req.document = document;
			return next();
		});
	}
}

exports.loadPopulated = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.documentId;
		Document.findOne({"_id": idCopy, "deleted": false}).populate({path: 'stylesets'}).exec(function (err, document) {
			if (err) return next(err);
			if (!document) {
				return next({message: "Document not found", status: 404});
			}
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!utils.hasAccessToModel(req.user, document)) return next(403);
			req.document = document;
			return next();
		});
	}
}

var create = exports.create = function (req, res, next) {
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

	document.defaultStyleset = project.styleset;
	document.save(function (err) {
		if (err) {
			return next(err);
		}

		project.documents.addToSet(document);
		project.save(function (err) {
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
	// Is text to be changed?
	if (req.body.text != undefined) {
		document.text = req.body.text;
	}
	// Is defaultStylset to be changed?
	if (req.body.defaultStyleset != undefined &&
		!utils_shared.mongooseEquals(document.defaultStyleset, req.body.defaultStyleset)) {
		var newDefaultStylset = req.body.defaultStyleset;
		if (newDefaultStylset) {
			var oldDefaultStylset = document.defaultStyleset;
			document.defaultStyleset = newDefaultStylset;
			// Remove any reference of the new defaultStyleset from the array of non-default stylesets.
			var stylesetIndex = document.stylesets.indexOf(newDefaultStylset);
			if (stylesetIndex >= 0) {
				document.stylesets.slice(stylesetIndex, 1);
			}
			document.stylesets.addToSet(oldDefaultStylset);
		} else {
			return next({message: "Document can not have defaultStyleset set to null!", status: 400});
		}
	}
	document.save(function (err, document) {
		if (err) {
			return next(err);
		}
		res.send({document: document});
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

	// TODO: also archive the document's stylesets and styles since these were copied?

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

	// TODO: also unarchive the document's stylesets and styles since these are copies?

	document.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({document: document});
	});
}

exports.delete = function (req, res, next) {
	var document = req.document;
	var project = req.project;

	project.documents.pull(document._id);
	project.deletedDocuments.addToSet(document);
	project.save(function (err) {
		if (err) {
			return next(err);
		}

		document.deleted = true;

		// TODO: also delete the document's stylesets and styles since these are copies?

		// TODO: is this acceptable? How else can we filter out deleted documents from a folder? (c.f. Folder.open())
		document.folderId = null;
		document.save(function (err) {
			if (err) {
				return next(err);
			}

			res.send({});
		});
	});
}

exports.rearrange = function (req, res, next) {
	var errorMessage = "/document/rearrange can only rearrange existing documents (not e.g. add or delete documents)";

	var rearrangedDocumentIds = req.body.documents;
	var existingDocumentIds = req.project.documents;

	if (rearrangedDocumentIds && rearrangedDocumentIds.length == existingDocumentIds.length) {
		async.each(rearrangedDocumentIds, function (rearrangedDocumentId, callback) {
			var containsRearrangedDocumentId = rearrangedDocumentIds.indexOf(rearrangedDocumentId) > -1;
			if (!containsRearrangedDocumentId) {
				return callback({message: errorMessage, status: 400});
			}
			return callback();
		}, function (err) {
			if (err) {
				return next(err);
			}
			req.project.documents = rearrangedDocumentIds;
			req.project.save(function (err, project) {
				if (err) {
					return next(err);
				}
				return res.send({project: project});
			});
		});
	} else {
		return next({message: errorMessage, status: 400});
	}
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
	var user = req.user;
	var name;
	var userDir = path.join(conf.resources.usersDir, conf.epub.userDirPrefix + user._id);
	var userUrl = conf.resources.usersUrl + '/' + user._id;
	for (var i = 0; i < files.length; i++) {
		var file = files[i];
		name = file.name;
		logger.info('Uploaded file ' + file.name + ' to ' + file.path + ' (' + file.size + ')');
		docConverter.execute(userDir, file.path, function (err, html) {
			if (err) {
				return next(new Error(err));
			}
			completedFiles++;
			importedHtml = importedHtml + html;
			if (completedFiles == files.length) {
				// All file imported
				// Update all img links to match the upload location
				importedHtml = importedHtml.replace(/(<img[^>]*src=")([^"]+")/g, '$1' + userUrl + '/$2');
				importedHtml = importedHtml.replace(/(<img[^>]*src=")[^"]+ObjectReplacements[^"]+/g, '$1http://scripler.com/images/broken_file.png');
				req.body.name = name;
				req.body.text = importedHtml;
				return create(req, res, next);
			}
		});
	}
}

exports.applyStyleset = function (req, res, next) {
	var stylesetToApply = req.styleset;
	var stylesetToApplyId = stylesetToApply._id;
	var documentStylesetIds = req.document.stylesets;
	var defaultStylesetId = req.document.defaultStyleset;

	/*
	 Only copy the styleset if it is not already applied to the document, i.e. if:
	 - The styleset to apply is not the same as the default styleset
	 AND
	 (
	 - The document does not have any stylesets
	 OR
	 - The styleset to apply is not in the document's stylesets
	 )

	 TODO: could use an IT or two.
	 */
	if (stylesetToApply._id != defaultStylesetId && (!documentStylesetIds || documentStylesetIds.length == 0 || documentStylesetIds.indexOf(stylesetToApply._id) < 0)) {
		copyStyleset(stylesetToApply, function(err, copy) {
			if (err) {
				return next(err);
			}

			req.document.stylesets.addToSet(copy);
			req.document.save(function (err) {
				if (err) {
					return next(err);
				}

				Styleset.findOne({"_id": copy._id}).populate('styles').exec(function (err, populatedCopy) {
					if (err) {
						return next(err);
					}

					res.send({styleset: populatedCopy});
				});
			});
		});
	} else {
		res.send({});
	}
}

exports.listStylesets = function (req, res, next) {
	var documentStylesets = req.document.stylesets;
	var userStylesetIds = req.user.stylesets;
	var resultStylesets = documentStylesets.slice(0);

	// Get user stylesets
	Styleset.find({"_id": {$in: userStylesetIds}}).exec(function (err, userStylesets) {
		if (err) {
			return next(err);
		}

		for (var i=0; i<userStylesets.length; i++) {
			var userStyleset = userStylesets[i];
			if (!utils.containsOriginal(documentStylesets, userStyleset)) {
				resultStylesets.push(userStyleset._id);
			}
		}

		// Populate the stylesets
		Styleset.find({"_id": {$in: resultStylesets}}).populate({path: 'styles'}).exec(function (err, stylesets) {
			if (err) {
				return next(err);
			}

			res.send({"stylesets": stylesets});
		});
	});

};

