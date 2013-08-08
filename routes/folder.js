var Project = require('../models/project.js').Project;
var Folder = require('../models/project.js').Folder;
var Document = require('../models/document.js').Document;
var utils = require('../lib/utils');

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
        			// Add sub folders to the result
        			result.folders = folder.folders;
        			
        			// Add documents to the result
        			var docs = Document.find({"folderId": req.params.folderId}, function (err, docs) {
        				if (err) {
        					res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        				} else if (docs) {
        					result.docs = docs;
        				}
        				
        				res.send({result: result});
        			});
        		} else {
        			// No, inform the caller
        			res.send({"errorMessage": "Folder not found"}, 404);
        			return;
        		}
        	} else {
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
    // TODO: implement
}

exports.unarchive = function (req, res) {
    // TODO: implement
}

exports.delete = function (req, res) {
    // TODO: implement
}
