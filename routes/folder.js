var Project = require('../models/project.js').Project;
var Folder = require('../models/project.js').Folder;
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

function saveAndRespond(res, project, folder) {
	project.save(function (err, project) {
		if (err) {
			res.send({
				"errorCode": err.code,
				"errorMessage": "Database problem",
				"errorDetails": err.err
			}, 400);
		} else {
			res.send({folder: folder});
		}
	 });
}

exports.create = function (req, res) {
	// Does a project exist for the folder?
	Project.findOne({"_id": req.body.projectId}, function (err, project) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 400);
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
        	
        	saveAndRespond(res, project, folder);
        }
	});
	
}

exports.archive = function (req, res) {
    // TODO: implement
}

exports.rename = function (req, res) {
	// TODO: implement
}

exports.delete = function (req, res) {
    // TODO: implement
}
