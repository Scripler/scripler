var Project = require('../models/project.js').Project;
var Folder = require('../models/project.js').Folder;
var Document = require('../models/document.js').Document;
var utils = require('../lib/utils');

/**
 * 
 * Filter out archived folders.
 * 
 * TODO: Move to generic (array) utility library + make generic, i.e. accept filter condition as parameter.
 * 
 * @param folders
 * @returns
 */
function filter(folders) {
	if (folders) {
		for (var i=0; i<folders.length; i++) {
			if (folders[i].archived) {
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
 * @returns
 */
function findFolder(folders, folderId) {
	if (!folders) return;
	
	var folder;	
	for (var i=0; i<folders.length; i++) {
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
 * Archive a folder, i.e. its child folders and documents, recursively.
 * 
 * @param folders
 * @param folderId
 * @returns
 */
function archiveFolder(folder, archived) {
	if (!folder) return;
	
	// Archive folder
	folder.archived = archived;
		
	// Archive documents (see http://mongoosejs.com/docs/2.7.x/docs/updating-documents.html)
	var conditions = { folderId: folder.id }
	  , update = { archived: archived }
	  , options = { multi: true };
	  
	var cb = function callback (err, numAffected) {
		if (err) {
			throw new Error(err);
		}
	};
	Document.update(conditions, update, options, cb);	

	// Process child folders
	if (folder.folders) {
		for (var i=0; i<folder.folders.length; i++) {
			archiveFolder(folder[i]);
		}		
	}
}

exports.create = function (req, res) {
	// Does a project exist for the folder?
	Project.findOne({"_id": req.body.projectId}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else { // Yes, create the folder
        	var folder = new Folder({
                // TODO: Add creating user
                name:      req.body.name,
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
        			parentFolder.folders.push(folder);
        		} else {
        			// No, inform the caller
        			res.send({"errorMessage": "Parent folder not found"}, 404);
        			return;
        		}        		
        	} else { 
        		// No, save the folder directly on the project (as a root folder)
        		project.folders.push(folder);        		
        	}
        	
        	project.save(function (err, project) {
        		if (err) {
        			res.send({
        				"errorCode": err.code,
        				"errorMessage": "Database problem",
        				"errorDetails": err.err
        			}, 503);
        		} else {
        			res.send({folder: folder});
        		}
        	});
        }
	});
	
}

exports.open = function (req, res) {
	// Does a project exist for the folder?
	Project.findOne({"_id": req.params.projectId}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else { // Yes, find the folder and return its contents
        	if (req.params.folderId) {
        		var folder = findFolder(project.folders, req.params.folderId);
        		
        		var result = {};
        		// Does the folder exist?
        		if (folder) {  // Yes, return its contents 
        			// Add child folders to the result
        			result.folders = filter(folder.folders);
        			
        			// Add documents to the result
        			var docs = Document.find({"folderId": req.params.folderId, "archived": false}, function (err, docs) {
        				if (err) {
        					res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        				} else if (docs) {
        					result.docs = docs;
        				}
        				
        				res.send({result: result});
        			});
        		} else { // No, inform the caller        			
        			res.send({"errorMessage": "Folder not found"}, 404);
        			return;
        		}
        	} else { // No, inform the caller
        		res.send({"errorMessage": "No folder specified"}, 400);
        	}
        }
	});
}

exports.rename = function (req, res) {
	Project.findOne({"_id": req.body.projectId}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else {
        	var folder = findFolder(project.folders, req.params.id);
        	
    		if (folder) {
    			folder.name = req.body.name;
                project.save(function (err) {
                    if (err) {
                        // return error
                        res.send({"errorMessage": "Database problem"}, 503);
                    } else {
                        res.send({folder: folder});
                    }
                });
    		} else {
    			res.send({"errorMessage": "Folder not found"}, 404);
    			return;
    		}
        }
	});
}

exports.archive = function (req, res) {
	// Does a project exist for the folder?
	Project.findOne({"_id": req.params.projectId}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else { // Yes, archive all folders and documents in the folder
        	if (req.params.folderId) {
        		var folder = findFolder(project.folders, req.params.folderId)
        		archiveFolder(folder, true); // Change that value! (urgh, see e.g.: http://stackoverflow.com/questions/518000/is-javascript-a-pass-by-reference-or-pass-by-value-language)
        		project.save(function (err, project) {
        			if (err) {
        	            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        			} else {
                		res.send({});
        			}
        		});
        	} else {
        		res.send({"errorMessage": "No folder specified"}, 400);
        	}
        }
	});
}

/**
 * Copy-paste of archive(), except for argument in call to archiveFolder().
 * 
 * TODO: implement generic function that takes archive/unarchive function as parameter.
 */
exports.unarchive = function (req, res) {
	// Does a project exist for the folder?
	Project.findOne({"_id": req.params.projectId}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else if (!project) {
            res.send({"errorMessage": "Project not found"}, 404);
        } else if (!utils.hasAccessToEntity(req.user, project)) {
            res.send({"errorMessage": "Access denied"}, 403);
        } else { // Yes, unarchive all folders and documents in the folder
        	if (req.params.folderId) {
        		var folder = findFolder(project.folders, req.params.folderId)
        		archiveFolder(folder, false); // Change that value! (urgh, see e.g.: http://stackoverflow.com/questions/518000/is-javascript-a-pass-by-reference-or-pass-by-value-language)
        		project.save(function (err, project) {
        			if (err) {
        	            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        			} else {
                		res.send({ folder: folder });
        			}
        		});
        	} else {
        		res.send({"errorMessage": "No folder specified"}, 400);
        	}
        }
	});
}

exports.delete = function (req, res) {
    // TODO: implement
}
