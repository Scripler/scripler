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
var rimraf = require('rimraf');
var ncp = require('ncp').ncp;
var epub3 = require('../lib/epub/epub3');

//Load project by id
exports.load = function (id) {
	return function (req, res, next) {
		id = id || req.body.projectId;
		Project.findOne({"_id": id, "deleted": false}).exec(function (err, project) {
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

exports.loadPopulated = function (id) {
	return function (req, res, next) {
		id = id || req.body.projectId;
		Project.findOne({"_id": id, "deleted": false}).populate({path: 'documents', match: {archived: false}, select: 'name folderId modified archived stylesets members type'}).exec(function (err, project) {
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
		id = id || req.body.projectId;
		Project.findOne({"_id": id, "deleted": false}).populate({path: 'documents', match: {archived: false}, select: 'name folderId modified archived stylesets members type text'}).exec(function (err, project) {
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
		]
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
			fs.mkdir(projectDir, function (err) {
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
	project.save(function (err) {
		if (err) {
			return next(err);
		}
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

		// Delete documents. Stylesets and styles should not be "deleted" since they could be in use by other projects. // TODO: is this still true with copies?
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
		order: project.order + 1,
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

	copyStyleset(project.styleset, function(err, copy) {
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
}

exports.rearrange = function (req, res, next) {
	var errorMessage = "/project/rearrange can only rearrange existing projects (not e.g. add or delete projects)";

	if (req.body.projects && req.body.projects.length == req.user.projects.length) {
		for (var i=0; i<req.body.projects.length; i++) {
			var rearrangedProject = req.body.projects[i];
			var containsRearrangedProject = utils.containsModel(req.body.projects, rearrangedProject);
			if (!containsRearrangedProject) {
				return next({message: errorMessage, status: 400});
			}
		}
		req.user.projects = req.body.projects;
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
	project.metadata.cover = req.body.cover;
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

exports.toc = function (req, res, next) {
	var project = req.project;
	project.metadata.toc = req.body;
	project.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({project: project});
	});
}

exports.compile = function (req, res) {
	var epub = epub3.create(req.user._id, req.project);
	var filename = req.project.metadata.title || req.project.name;
	var saneTitle = sanitize(filename);
	res.setHeader('Content-disposition', 'attachment; filename=' + saneTitle);
	res.setHeader('Content-type', 'application/epub+zip');
	epub.pipe(res);
}

exports.applyStyleset = function (req, res, next) {
	var stylesetToApply = req.styleset; // This will always (?) be a styleset from User
	var activeStyleset = req.project.styleset;
	// Only apply the styleset if no styleset is already applied - or if the styleset applied is not the one the user is trying to apply.
	// This is important because applying a styleset will COPY the styleset and we don't want a lot of unused stylesets lying around.
	if (!activeStyleset || (activeStyleset && !(stylesetToApply._id.equals(activeStyleset)))) {
		copyStyleset(stylesetToApply, function(err, copy) {
			if (err) {
				return next(err);
			}

			req.project.styleset = copy;
			req.project.save(function (err) {
				if (err) {
					return next(err);
				}
				res.send({project: req.project});
			});
		});
	} else {
		res.send({});
	}
}
