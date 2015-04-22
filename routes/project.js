var Project = require('../models/project.js').Project;
var User = require('../models/user.js').User;
var Document = require('../models/document.js').Document;
var Styleset = require('../models/styleset.js').Styleset;
var copyStyleset = require('../models/styleset.js').copy;
var Style = require('../models/style.js').Style;
var utils = require('../lib/utils');
var extend = require('xtend');
var sanitize = require('sanitize-filename');
var conf = require('config');
var path = require('path');
var fs = require('fs');
var ncp = require('ncp').ncp;
var epub3 = require('../lib/epub/epub3');
var mkdirp = require('mkdirp');
var async = require('async');
var project_utils = require('../lib/project-utils');
var TOCEntry = require('../models/project.js').TOCEntry;
var env = process.env.NODE_ENV;
var emailer = require('../lib/email/email.js');
var exec = require('child_process').exec;
var logger = require('../lib/logger');
var uuid_lib = require('node-uuid');
var document_utils = require('../lib/document-utils');

//Load project by id
exports.load = function (id) {
	return function (req, res, next) {
		// Avoiding global scope!
		var idCopy = id || req.body.projectId;
		Project.findOne({"_id": idCopy, "deleted": false}).exec(function (err, project) {
			if (err) return next(err);
			if (!project) {
				return next({message: "Project not found", status: 404});
			}
			// Only check access if user is associated with request.
			// Let missing authentication be handled in auth middleware
			if (req.user && !utils.hasAccessToModel(req.user, project)) return next(403);

			req.project = project;
			return next();
		});
	}
}

exports.loadPopulated = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.projectId;
		Project.findOne({"_id": idCopy, "deleted": false}).populate({path: 'documents', select: 'name folderId modified archived stylesets defaultStyleset members type'}).exec(function (err, project) {
			if (err) return next(err);
			if (!project) {
				return next({message: "Project not found", status: 404});
			}
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!utils.hasAccessToModel(req.user, project)) return next(403);

			req.project = project;
			return next();
		});
	}
}

exports.loadPopulatedFull = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.projectId;
		Project.findOne({"_id": idCopy, "deleted": false}).populate({path: 'documents', match: {archived: false}, select: 'name folderId modified archived stylesets defaultStyleset members type text'}).exec(function (err, project) {
			if (err) return next(err);
			if (!project) {
				return next({message: "Project not found", status: 404});
			}
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!utils.hasAccessToModel(req.user, project)) return next(403);

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

exports.create = function (req, res, next) {
	var project = new Project({
		name: req.body.name,
		members: [
			{userId: req.user._id, access: ["admin"]}
		],
		styleset: req.user.defaultStyleset
	});
	project.save(function (err) {
		if (err) {
			return next(err);
		}
		req.user.projects.addToSet(project);
		req.user.save(function (err) {
			if (err) {
				return next(err);
			}

			var projectDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + project._id);
			var dstImagesDir = path.join(projectDir, conf.epub.imagesDir);

			// mkdirp automatically creates all missing parent folders so we can simply create one of the sub folders, e.g. Images
            mkdirp(dstImagesDir, function (err) {
				if (err) {
					return next(err);
				}

				res.send({project: project});
			});
		});
	});
}

exports.open = function (req, res) {
	res.send({ project: req.project });
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

	// TODO: also archive the project's documents?
	// TODO: also archive the stylesets and styles of the documents of the project since these are copies?

	project.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({project: project});
	});
}

exports.unarchive = function (req, res, next) {
	var project = req.project;
	project.archived = false;

	// TODO: also unarchive the project's documents?
	// TODO: also unarchive the stylesets and styles of the documents of the project since these are copies?

	project.save(function (err) {
		if (err) {
			return next(err);
		}

		// TODO: don't add the members since we didn't remove them while archiving?
		var membersArray = [];
		for (var i = 0; i < project.members.length; i++) {
			membersArray.push(project.members[i].userId);
		}
		res.send({project: project});
	});
}

exports.delete = function (req, res, next) {
	var project = req.project;

	User.update({"projects": project._id}, {"$pull": {"projects": project._id}}, {multi: true}, function (err, numberAffected, raw) {
		if (err) {
			return next(err);
		}

		req.user.deletedProjects.push(project);
		req.user.save();

		// TODO: also delete the stylesets and styles of the documents of the project since these are copies?

		// "Delete" documents
		Document.find({projectId: project._id}, function (err, documents) {
			var numberOfDocumentsToBeDeleted = documents.length;
			if (numberOfDocumentsToBeDeleted == 0) {
				res.send({});
			} else {
				documents.forEach(function (document) {
					Project.update({"documents": document._id}, {"$pull": {"documents": document._id}}, {multi: true}, function (err, numberAffected, raw) {
						if (err) {
							return next(err);
						}

						document.deleted = true;
						document.save(function (err) {
							if (err) {
								return next(err);
							}

							project.deletedDocuments.push(document);
							numberOfDocumentsToBeDeleted--;
							if (numberOfDocumentsToBeDeleted == 0) {
								project.deleted = true;
								project.save();
								res.send({});
							}
						});
					});
				});
			}
		});
	});
}

exports.copy = function (req, res, next) {
	var project = req.project;

	var newProject = new Project({
		name: project.name + " - Copy",
		folders: project.folders, // Folders are only used inside a project => ids do not need to be copies
		members: project.members,
		metadata: extend({}, project.metadata)
	});
	newProject.metadata.toc = project.metadata.toc;

	// Add to user (last project in order)
	req.user.projects.addToSet(newProject);
	req.user.save();

	// Copy documents
	var newDocuments = [];
	for (var i = 0; i < project.documents.length; i++) {
		var document = project.documents[i];
		var newDocument = new Document({
			name: document.name,
			text: document.text,
			projectId: newProject, // TODO: shouldn't this be newProject._id?
			type: document.type,
			folderId: document.folderId,
			members: document.members,
			archived: document.archived
		});
		newProject.documents.push(newDocument);
		newDocuments.push(newDocument);
	}

	Styleset.findOne({"_id": project.styleset}).exec(function (err, styleset) {
		if (err) {
			return next(err);
		}

		copyStyleset(styleset, function(err, copy) {
			if (err) {
				return next(err);
			}

			newProject.styleset = copy;

			newProject.save(function (err) {
				if (err) {
					return next(err);
				}

				Document.create(newDocuments, function (err) {
					if (err) {
						return next(err);
					}

					var projectDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + project._id);
					var imagesDir = path.join(projectDir, conf.epub.imagesDir);

					var newProjectDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + newProject._id);
					var newImagesDir = path.join(newProjectDir, conf.epub.imagesDir);

					ncp(projectDir, newProjectDir, function (err) {
						if (err) {
							return next(err);
						}
						res.send({project: newProject});
					});
				});
			});
		});
	});

}

exports.rearrange = function (req, res, next) {
	var errorMessage = "/project/rearrange can only rearrange existing projects (not e.g. add or delete projects)";

	var rearrangedProjectIds = req.body.projects;
	var existingProjectIds = req.user.projects;

	if (rearrangedProjectIds && rearrangedProjectIds.length == existingProjectIds.length) {
		for (var i=0; i<rearrangedProjectIds.length; i++) {
			var rearrangedProjectId = rearrangedProjectIds[i];
			var containsRearrangedProjectId = existingProjectIds.indexOf(rearrangedProjectId) > -1;
			if (!containsRearrangedProjectId) {
				return next({message: errorMessage, status: 400});
			}
		}
		req.user.projects = rearrangedProjectIds;
		req.user.save(function (err) {
			if (err) {
				return next(err);
			}
			list(req, res);
		});
	} else {
		return next({message: errorMessage, status: 400});
	}
}

exports.metadata = function (req, res, next) {
	var project = req.project;
	project.metadata.isbn = req.body.isbn;
	project.metadata.title = req.body.title;
	project.metadata.description = req.body.description;
	project.metadata.authors = req.body.authors;
	project.metadata.keywords = req.body.keywords;
	project.metadata.language = req.body.language;
	project.metadata.publicationDate = req.body.publicationDate;
	project.metadata.type = req.body.type;
	project.metadata.rights = req.body.rights;
	project.metadata.contributors = req.body.contributors;
	project.metadata.publisher = req.body.publisher;
	project.metadata.coverage = req.body.coverage;
	project.metadata.relation = req.body.relation;
	project.metadata.source = req.body.source;

	project.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({project: project});
	});
}

exports.metadata_cover = function (req, res, next) {
	var project = req.project;
	project.metadata.cover = req.body.cover;

	project.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({project: project});
	});
}

exports.set_toc = function (req, res, next) {
	var project = req.project;
	project.metadata.toc = req.body;
	project.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({project: project});
	});
}

exports.get_toc = function (req, res, next) {
	var project = req.project;
	var documents = project.documents;
	var documentToCs = [];

	var getDocumentToC = function (document, callback) {
		if (project_utils.includeInEbook(document)) {
			var documentId = document._id;
			var documentType = document.type;
			var documentFilename;
			if (project_utils.isSystemType(documentType)) {
				var documentTypeName = project_utils.getDocumentTypeName(documentType, documents);
				documentFilename = documentTypeName + ".html";
			} else {
				documentFilename = conf.epub.documentPrefix + documentId + ".html";
			}

			var target = documentFilename;

			var tocEntry = new TOCEntry({
				id: documentId,
				type: 'document',
				level: 0,
				target: target,
				text: document.name
			});

			var documentToCEntries = [tocEntry];
			var documentChildToCEntries = project_utils.generateToCJSON(target, document.text);
			Array.prototype.push.apply(documentToCEntries, documentChildToCEntries);
			documentToCs[documentId] = documentToCEntries;
		}

		callback();
	};

	async.each(documents, getDocumentToC, function(err) {
		if (err) {
			return next(err);
		}

		// async.each() does not guarantee to process elements in order, so we must do it ourselves - because we still like to get things done in parallel
		var sortedToCEntries = project_utils.sortToCEntries(documents, documentToCs);
	 	res.send({toc: sortedToCEntries});
	});
}

exports.compile = function (req, res, next) {
	var userId = req.user._id;
	epub3.create(userId, req.project, function (err, epub) {
		if (err) {
			return next(err);
		}

		// TODO: When a GUI design has been made, also return the EPUB validation result to client
		var userEpubDownloadUrl = conf.app.url_prefix + 'project/' + req.project._id + '/epub';
		res.send({url: userEpubDownloadUrl});

		if ('test' != env && conf.epub.validatorEnabled) {
			// Create a temporary file to avoid the second compile() call from the client, c.f. #483, trying to write to the same file while the EPUB checker has it open.
			var tempFilename = path.join(conf.epub.tmpDir, uuid_lib.v4() + ".epub");
			var tempFile = fs.createWriteStream(tempFilename);
			epub.pipe(tempFile);

			tempFile.once('close', function() {
				// The sending of the validation result email can happen after the response has been returned to the user but must happen on the temp file, c.f. comment above.
				var fullPath = tempFilename;
				exec('java -jar ' + conf.epub.validatorPath + ' "' + fullPath + '"',
					function (error, stdout, stderr) {
						var epubValidationResult = "OK";
						var errorMessage = null;
						if (error !== null) {
							epubValidationResult = "ERROR";
							errorMessage = error.code + ':\n' + error.stack;
						}

						var userEpubFilename = (req.project.metadata.title || req.project.name) + ".epub";
						var saneTitle = sanitize(userEpubFilename);
						var scriplerEpubDownloadUrl = conf.resources.usersUrl + "/" + conf.epub.userDirPrefix + userId + "/" + req.project._id + '.epub';
						var authorName = req.user.firstname + " " + req.user.lastname;

						logger.info('EPUB Validation Result');
						logger.info('Author name: ' + authorName);
						logger.info('EPUB filename: ' + saneTitle + ' (' + fullPath + ')');
						logger.info('Validation Result: ' + epubValidationResult);
						if (errorMessage !== null) logger.error('Error: ' + errorMessage);

						// Dummy user who is the recipient of the validation result
						var validationResultRecipient = {
							_id: req.user._id, // TODO: just use a dummy id?
							email: conf.epub.validationResultEmail,
							firstname: "Frank",
							lastname: "EPUB"
						};

						emailer.sendUserEmail(
							validationResultRecipient,
							[
								{name: "USEREMAIL", content: req.user.email},
								{name: "NAME", content: authorName},
								{name: "EPUBTITLE", content: saneTitle},
								{name: "EPUBURL", content: scriplerEpubDownloadUrl},
								{name: "EPUBVALIDATIONRESULT", content: epubValidationResult},
								{name: "ERROR", content: errorMessage}
							],
							'epub-validation-result'
						);

						fs.unlink(tempFilename, function () {});
					}
				);
			});
		}
	});

}

exports.publish = function (req, res, next) {
	var project = req.project;
	var userEpubPath = path.join(conf.resources.usersDir, conf.epub.userDirPrefix + req.user._id, project._id + '.epub');
	var publishEpubPath = path.join(conf.resources.publishDir, req.project._id + '.epub');

	utils.copyFile(userEpubPath, publishEpubPath, function(err) {
		if (err) {
			return next(err);
		}
		// Get title without whitespace
		var epubName = utils.cleanUrlPart(project.metadata.title || project.name);
		var epubAuthor = '';
		if (project.metadata.authors && project.metadata.authors[0]) {
			epubAuthor = utils.cleanUrlPart(project.metadata.authors[0]) + "-";
		}
		project.publish.url = conf.app.url_prefix + conf.publish.route + "/" + project.id + "/" + epubAuthor + epubName;

		// Only set created date initially - if already set, we are updating/republishing
		if (!project.publish.created) {
			project.publish.created = Date.now();
		}
		project.publish.modified = Date.now();
		project.publish.title = req.project.metadata.title || req.project.name || '';
		project.publish.description = project.metadata.description || '';

		// Generate image
		var imagePath = path.join(conf.resources.publishDir, req.project._id + '.jpg');
		project.publish.image = conf.resources.publishUrl + "/" + project.id + ".jpg";

		utils.generatePreview(project, imagePath, function (err) {
			if (err) {
				return next(err);
			}
			project.save(function (err) {
				if (err) {
					return next(err);
				}
				res.send({
					publish: project.publish
				});
			});
		});
	});
}

exports.unpublish = function (req, res, next) {
	var project = req.project;
	var publishEpubPath = path.join(conf.resources.publishDir, req.project._id + '.epub');

	if (project.publish.url) {
		// Delete the published epub
		fs.unlink(publishEpubPath, function (err) {
			if (err) {
				return next(err);
			}
			//Set to unpublished in the database
			project.publish.url = null;
			project.save(function (err) {
				if (err) {
					return next(err);
				}
				res.send({publish: project.publish});
			});
		});
	} else {
		logger.warn("Unpublish called for already unpublished project.");
		res.send({publish: project.publish});
	}
}

exports.renderEpubReader = function (req, res, next) {
	var project = req.project;
	if (project.publish.url) {
		res.render('ebook', {
			id: project.id,
			title: project.publish.title,
			description: project.publish.description,
			image: project.publish.image,
			url: project.publish.url,
			env: env
		});
	} else {
		res.redirect(conf.app.url_prefix + '?code=' + "301");//Non-published ebook
	}
}
exports.downloadEpub = function (req, res, next) {
	var userEpubFullPath = path.join(conf.resources.usersDir, conf.epub.userDirPrefix + req.user._id, req.project._id + '.epub');
	var userEpubFilename = (req.project.metadata.title || req.project.name) + ".epub";
	var saneTitle = sanitize(userEpubFilename);
	res.download(userEpubFullPath, saneTitle);
	logger.info(req.user.firstname + ' ' + req.user.lastname + ' (user' + req.user._id + ') downloaded ebook ' + saneTitle + ' (' + req.project._id + '.epub)');
}

exports.applyStyleset = function(req, res, next) {
	var stylesetToApply = req.styleset;
	var level = req.user.level;
	req.project.styleset = stylesetToApply._id;

	// If input was document styleset instead of user-styleset, we need to look up the user-styleset.
	Styleset.findOne({"_id": stylesetToApply.original}).exec(function (err, stylesetOriginal) {
		if (err) {
			return next(err);
		}

		if (!stylesetOriginal.isSystem) {
			// If original styleset is system styleset, we already had the user styleset.
			// Otherwise we had the document-styleset, and now got the user-styleset.
			stylesetToApply = stylesetOriginal;
		}

		// Apply the styleset to all the projects' documents
		async.each(req.project.documents, function(document, callback) {
			document_utils.applyStylesetToDocument(document, stylesetToApply, true, level, function(err, populatedStyleset) {
				if (err) {
					return callback(err);
				} else {
					callback();
				}
			});
		}, function(err) {
			if (err) {
				return next(err);
			} else {
				req.project.save(function(err) {
					if (err) {
						return next(err);
					}
					res.send({
						project: req.project
					});
				});
			}
		});
	});
}