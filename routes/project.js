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
var mkdirp = require('mkdirp');

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
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!utils.hasAccessToModel(req.user, project)) return next(403);

			req.project = project;
			return next();
		});
	}
}

exports.loadPopulated = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.projectId;
		Project.findOne({"_id": idCopy, "deleted": false}).populate({path: 'documents', match: {archived: false}, select: 'name folderId modified archived stylesets members type'}).exec(function (err, project) {
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
		Project.findOne({"_id": idCopy, "deleted": false}).populate({path: 'documents', match: {archived: false}, select: 'name folderId modified archived stylesets members type text'}).exec(function (err, project) {
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
            mkdirp(projectDir, function (err) {
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
			var containsRearrangedProjectId = rearrangedProjectIds.indexOf(rearrangedProjectId) > -1;
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
	req.project.styleset = req.styleset;
	req.project.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({project: req.project});
	});
}
