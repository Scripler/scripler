var Project = require('../models/project.js').Project;
var Folder = require('../models/project.js').Folder;
var Document = require('../models/document.js').Document;
var utils = require('../lib/utils');

/**
 *
 * Filter out archived or unarchived folders (or anything else with "length" and "archived" properties).
 *
 * FIXME: make recursive (currently only filters one level of folders).
 * TODO: Move to generic (array) utility library.
 *
 * @param folders
 * @param archived
 * @returns folders
 */
function filter(folders, archived) {
	if (folders) {
		for (var i = 0; i < folders.length; i++) {
			if (folders[i].archived == archived) {
				folders.splice(i, 1);
			}
		}
	}
	return folders;
}

/**
 *
 * Find a folder recursively.
 *
 * @param folders
 * @param folderId
 * @returns folder
 */
function findFolder(folders, folderId) {
	if (!folders) return;

	var folder;
	for (var i = 0; i < folders.length; i++) {
		if (folders[i].id == folderId) {
			folder = folders[i];
			break;
		} else {
			folder = findFolder(folders[i].folders, folderId);
			if (folder) {
				break;
			}
		}
	}
	return folder;
}

/**
 *
 * Archive/unarchive a folder, i.e. its child folders and documents, recursively.
 *
 * @param folder
 * @param archived
 */
function archiveFolder(folder, archived) {
	if (!folder) return;

	// Archive folder
	folder.archived = archived;

	// Archive documents (see http://mongoosejs.com/docs/2.7.x/docs/updating-documents.html)
	var conditions = { folderId: folder.id }
		, update = { archived: archived }
		, options = { multi: true };

	var cb = function callback(err, numAffected) {
		if (err) {
			throw new Error(err);
		}
	};
	Document.update(conditions, update, options, cb);

	// Process child folders
	if (folder.folders) {
		for (var i = 0; i < folder.folders.length; i++) {
			archiveFolder(folder[i]);
		}
	}
}

/**
 *
 * Delete a folder's contents, i.e. its child folders and documents, recursively (depth-first and bottom-up).
 *
 * This function does NOT delete the folder itself from its parent (i.e. either the project or a parent folder).
 *
 * @param projectId
 * @param folder
 */
function deleteFolder(projectId, folder) {
	// Process child folders depth-first
	if (folder.folders) {
		for (var i = 0; i < folder.folders.length; i++) {
			deleteFolder(projectId, folder.folders[i]);
		}
	}

	// Delete documents
	Document.find({ projectId: projectId, folderId: folder.id }, function (err, documents) {
		documents.forEach(function (document) {
			document.remove();
		});
	});

	// Delete folders (the parent folder deletes its child folders)
	if (folder.folders) {
		for (var i = 0; i < folder.folders.length; i++) {
			folder.folders.pop();
		}
	}
}

exports.create = function (req, res, next) {
	var project = req.project;
	var folder = new Folder({
		name: req.body.name,
		members: [
			{userId: req.user._id, access: ["admin"]}
		]
	});

	// Did the caller indicate that the folder has a parent folder?
	if (req.body.parentFolderId) {
		var parentFolder = findFolder(project.folders, req.body.parentFolderId);

		// Yes, does the parent folder exist?
		if (parentFolder) {
			// Yes, save the new folder as a child
			parentFolder.folders.addToSet(folder);
		} else {
			// No, inform the caller
			return next({message: "Parent folder not found", status: 404});
		}
	} else {
		// No, save the folder directly on the project (as a root folder)
		project.folders.addToSet(folder);
	}

	project.save(function (err, project) {
		if (err) {
			return next(err);
		}
		res.send({folder: folder});
	});
}

/*
 * Open a folder.
 * 
 * This function can be used to open the specifal folder "archive" (trash) by calling it with the id of 
 * the project's root folder and setting the optional parameter "archived" to true.
 */
exports.open = function (req, res, next) {
	// Does a project exist for the folder?
	var project = req.project;

	if (req.params.folderId) {
		var folder = findFolder(project.folders, req.params.folderId);

		var result = {};
		// Does the folder exist?
		if (folder) {  // Yes, return its contents
			// Add child folders to the result

			// NB! To filter out folders, use the negated value of parameter "archived" (also: good ol' strings)
			var archived = (req.params.archived && req.params.archived == "true") ? true : false;
			result.folders = filter(folder.folders, !archived);

			// Add documents to the result
			if (archived) { // Return the project's archived documents
				// Populate the project's documents
				project.populate({path: "documents", match: {"archived": archived}}, function (err, project) {
					if (err) {
						return next(err);
					} else if (project) {
						result.docs = project.documents;
						res.send({result: result});
					}
				});
			} else { // Return the folder's documents
				// TODO: enable sorting for folders! How exactly?
				Document.find({"projectId": req.params.projectId, "folderId": req.params.folderId, "archived": archived}, function (err, docs) {
					if (err) {
						return next(err);
					} else if (docs) {
						result.docs = docs;
						res.send({result: result});
					}
				});
			}
		} else { // No, inform the caller
			return next({message: "Folder not found", status: 404});
		}
	} else { // No, inform the caller
		return next({message: "No folder specified", status: 400});
	}
}

exports.rename = function (req, res, next) {
	var project = req.project;
	var folder = findFolder(project.folders, req.params.id);

	if (folder) {
		folder.name = req.body.name;
		project.save(function (err) {
			if (err) {
				return next(err);
			} else {
				res.send({folder: folder});
			}
		});
	} else {
		return next({message: "Folder not found", status: 404});
	}
}

exports.archive = function (req, res, next) {
	var project = req.project;
	if (req.params.folderId) {
		var folder = findFolder(project.folders, req.params.folderId);
		archiveFolder(folder, true); // Change that value! (urgh, see e.g.: http://stackoverflow.com/questions/518000/is-javascript-a-pass-by-reference-or-pass-by-value-language)
		project.save(function (err, project) {
			if (err) {
				return next(err);
			}
			res.send({});
		});
	} else {
		return next({message: "No folder specified", status: 400});
	}
}

/**
 * Copy-paste of archive(), except for argument in call to archiveFolder().
 *
 * TODO: implement generic function that takes archive/unarchive function as parameter.
 */
exports.unarchive = function (req, res, next) {
	var project = req.project;
	if (req.params.folderId) {
		var folder = findFolder(project.folders, req.params.folderId);
		archiveFolder(folder, false); // Change that value! (urgh, see e.g.: http://stackoverflow.com/questions/518000/is-javascript-a-pass-by-reference-or-pass-by-value-language)
		project.save(function (err, project) {
			if (err) {
				return next(err);
			}
			res.send({ folder: folder });
		});
	} else {
		return next({message: "No folder specified", status: 400});
	}
}

/**
 * Copy-paste of archive(), except for call to deleteFolder().
 *
 * TODO: implement generic function that takes a delete function as parameter.
 */
exports.delete = function (req, res, next) {
	var project = req.project;
	if (req.params.folderId) {

		// Remove folder contents, i.e. child folders and documents
		var folder = findFolder(project.folders, req.params.folderId);
		deleteFolder(req.params.projectId, folder);

		// Remove folder from parent, i.e. either the project or a parent folder...

		// Did the caller indicate that the folder has a parent folder?
		if (req.params.parentFolderId) { // Yes, remove the folder on the parent folder
			var parentFolder = findFolder(project.folders, req.params.parentFolderId);
			if (parentFolder) {
				parentFolder.folders.id(req.params.folderId).remove();
			} else {
				return next({message: "Parent folder specified but not found", status: 400});
			}
		} else { // No, remove the folder directly from the project
			project.folders.id(req.params.folderId).remove();
		}

		project.save(function (err, project) {
			if (err) {
				return next(err);
			}
			res.send({});
		});
	} else {
		return next({message: "No folder specified", status: 400});
	}
}
