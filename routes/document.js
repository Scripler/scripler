var Document = require('../models/document.js').Document;
var Project = require('../models/project.js').Project;
var Styleset = require('../models/styleset.js').Styleset;
var Font = require('../models/font.js').Font;
var copyStyleset = require('../models/styleset.js').copy;
var utils_shared = require('../public/create/scripts/utils-shared');
var utils = require('../lib/utils');
var docConverter = require('../lib/doc-converter');
var path = require('path');
var async = require('async');
var conf = require('config');
var logger = require('../lib/logger');
var styleset_utils = require('../lib/styleset-utils');
var document_utils = require('../lib/document-utils');
var Image = require('../models/image.js').Image;
var User = require('../models/user.js').User;
var fs = require('fs');

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

	Styleset.findOne({"_id": project.styleset}, function (err, styleset) {
		if (err) {
			return next(err);
		}

		copyStyleset(styleset, function(err, copy) {
			if (err) {
				return next(err);
			}

			document.defaultStyleset = copy;
			document.stylesets.addToSet(copy);
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
		});
	});
}

exports.open = function (req, res) {
	res.send({document: req.document});
}

exports.update = function (req, res, next) {
	var document = req.document;

	// Is text to be changed?
	if (req.body.text != undefined) {
		document.text = req.body.text;
	}

	// TODO: implement via styleset-utils.getStylsetOrStyleType()?

	// Is defaultstyleset to be changed?
	if (req.body.defaultStyleset != undefined &&
		!utils_shared.mongooseEquals(document.defaultStyleset, req.body.defaultStyleset)) {
		var newDefaultstyleset = req.body.defaultStyleset;
		if (newDefaultstyleset) {
			document.defaultStyleset = newDefaultstyleset;
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

	if (req.user.level == "free" && document.type == "madewithscripler") {
		return next({message: "Free users are not allowed to archive the \"made with scripler\" document", status: 402});
	}

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

	if (req.user.level == "free" && document.type == "madewithscripler") {
		return next({message: "Free users are not allowed to delete the \"made with scripler\" document", status: 402});
	}

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
			var containsRearrangedDocumentId = existingDocumentIds.indexOf(rearrangedDocumentId) > -1;
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
	var project = req.project;
	// If only a single file was uploaded, *files* is not an array.
	// In that case, we make it an array, to handle single- ang multi-fileuploads the same way.
	if (!(files instanceof Array)) {
		files = [files];
	}
	var completedFiles = 0;
	var importedHtml = '';
	var user = req.user;
	var name;
	var imagesDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + project.id, conf.epub.imagesDir);
	var imagesUrl = conf.resources.projectsUrl + '/' + conf.epub.projectDirPrefix + project.id + '/' + conf.epub.imagesDir;
	for (var i = 0; i < files.length; i++) {
		var file = files[i];
		name = file.name;
		logger.info('Uploaded file ' + file.name + ' to ' + file.path + ' (' + file.size + ')');
		docConverter.execute(imagesDir, file.path, function (err, html) {
			if (err) {
				return next(new Error(err));
			}
			completedFiles++;
			importedHtml = importedHtml + html;
			if (completedFiles == files.length) {
				// All file imported
				var totalBytes = 0;
				var storageLimitBytes = 0;
				if (conf.subscriptions[req.user.level] && conf.subscriptions[req.user.level].storage) {
					storageLimitBytes = conf.subscriptions[req.user.level].storage;
				}
				// Update all img links to match the upload location
				importedHtml = importedHtml.replace(/(<img[^>]*src=")([^"]+")/g, '$1' + imagesUrl + '/$2');
				importedHtml = importedHtml.replace(/(<img[^>]*src=")[^"]+ObjectReplacements[^"]+/g, '$1http://scripler.com/create/pages/images/broken_file.png');

				// Add proper ToC id's to all heading
				var prefix = 'id_';
				var index = 1;
				importedHtml = importedHtml.replace(/(<h\d(?![^>]*id=))/g, function (_, group) {
					return group + ' id="'+prefix + index++ +'"';
				});

				// Find all images, check their filessizes, and create their image objects in the database
				var regex = new RegExp('<img[^>]*src="'+imagesUrl+'/([^"]+)"', 'g');
				var match;
				var imageFileNames = [];
				while (match = regex.exec(importedHtml)) {
					imageFileNames.push(match[1]);
				}
				async.each(imageFileNames, function(imageFileName, callback){

					var absolutePath = path.join(imagesDir, imageFileName);
					var fileExtension = utils.getFileExtension(imageFileName);
					var mediaType = utils.getMediaType(fileExtension);

					fs.stat(absolutePath, function(err,stats){
						if (err) {
							return callback(err);
						}
						totalBytes += stats.size;
						if (req.user.storageUsed + totalBytes > storageLimitBytes) {
							return next({message: "User storage quota exceeded (" + (req.user.storageUsed + totalBytes) + " > " + storageLimitBytes + " bytes)", status: 402});
						}

						var image = new Image({
							projectId: project._id,
							members: [
								{userId: req.user._id, access: ["admin"]}
							],
							fileExtension: fileExtension,
							mediaType: mediaType
						});
						var imageNameWithoutExtension = utils.cleanFilename(utils.getFilenameWithoutExtension(imageFileName));
						var finalName = imageNameWithoutExtension + '-' + image._id + '.'  + fileExtension;
						image.name = finalName;

						importedHtml = importedHtml.replace(new RegExp('(<img[^>]*src="'+imagesUrl+'/)('+imageFileName+')'), '$1' + finalName );

						// Rename from old filename to new filename.
						fs.rename(absolutePath, path.join(imagesDir, finalName));

						image.save(function (err) {
							if (err) {
								return callback(err);
							}
							project.images.addToSet(image);
							callback();
						});
					});

				}, function (err){
					if (err) {
						return next(err);
					}
					// If any images where uploaded, add to user stoage
					if (totalBytes > 0) {
						// Image(s) was correctly uploaded and stored on project.
						// As a background task update the users stoageUsed value.
						// Don't wait for it - customer will just be happy if it fails.
						User.update({_id: req.user._id}, {$inc: {storageUsed: totalBytes}}, function (err, numAffected) {
							if (err) {
								logger.error("Could not update users storageUsed value: " + err, req.user);
							}
						});
					}

					// Create will save the other changes to project so no need to save project before calling create.
					req.body.name = utils.getFilenameWithoutExtension(name);
					req.body.text = importedHtml;
					return create(req, res, next);
				});

			}
		});
	}
}

exports.applyStyleset = function (req, res, next) {
	var stylesetToApply = req.styleset;
	document_utils.applyStylesetToDocument(req.document, stylesetToApply, false, req.user.level, function(err, populatedStyleset) {
		if (err) {
			return next(err);
		} else if (!populatedStyleset) {
			res.send({});
		} else {
			res.send({styleset: populatedStyleset});
		}
	});
}

exports.listStylesets = function (req, res, next) {
	var documentStylesets = req.document.stylesets;
	var userStylesetIds = req.user.stylesets;
	var resultStylesets = documentStylesets.slice(0);

	//logger.info('resultStylesets: ' + resultStylesets);
	//logger.info('documentStylesets: ' + documentStylesets);

	// Get user stylesets
	Styleset.find({"_id": {$in: userStylesetIds}}).exec(function (err, userStylesets) {
		if (err) {
			return next(err);
		}

		//logger.info('userStylesets: ' + userStylesets);

		for (var i=0; i<userStylesets.length; i++) {
			var userStyleset = userStylesets[i];
			if (!utils.containsOriginal(documentStylesets, userStyleset)) {
				//logger.info('Adding user styleset...' + userStyleset);
				resultStylesets.push(userStyleset._id);
			}
		}

		// Populate the stylesets
		Styleset.find({"_id": {$in: resultStylesets}}, null, { sort: { order: 1 }}).populate({path: 'styles'}).exec(function (err, stylesets) {
			if (err) {
				return next(err);
			}

			async.each(stylesets, function (styleset, callback) {
				styleset.styles.sort(styleset_utils.systemStyleOrder);
				callback();
			}, function (err) {
				if (err) {
					return next(err);
				}

				res.send({"stylesets": stylesets});
			});
		});
	});

};

