var conf = require('config');
var Image = require('../models/image.js').Image;
var Project = require('../models/project.js').Project;
var User = require('../models/user.js').User;
var utils = require('../lib/utils');
var async = require('async');
var path = require('path');
var mkdirp = require('mkdirp');
var fs = require('fs');
var logger = require('../lib/logger');
var mongoose = require('mongoose')
var user_utils = require('../lib/user-utils');

exports.create = function (req, res, next) {
	var project = req.project;
	var imagePrefix = conf.epub.imagePrefix;

	var files = req.files.file;
	if (!(files instanceof Array)) {
		files = [files];
	}

	var totalBytes = 0;
	var images = [];
	var storageLimitBytes = 0;
	if (conf.subscriptions[req.user.level] && conf.subscriptions[req.user.level].storage) {
		storageLimitBytes = conf.subscriptions[req.user.level].storage;
	}

	for (var i = 0; i < files.length; i++) {
		totalBytes += files[i].size;
	}

	if (req.user.storageUsed + totalBytes > storageLimitBytes) {
		logger.error("User " + req.user._id + " tried to exceed storage quota (" + (req.user.storageUsed + totalBytes) + " > " + storageLimitBytes + " bytes)");
		var errorMessageToUser = user_utils.getStorageLimitErrorMessage(req.user.level, conf.subscriptions[req.user.level].storage);
		return next({message: errorMessageToUser, status: 402});
	}

	async.each(files, function (file, callback) {
		var originalFilename = file.originalFilename;
		var fileExtension = utils.getFileExtension(originalFilename);
		var mediaType = utils.getMediaType(fileExtension);

		var image = new Image({
			projectId: project._id,
			members: [
				{userId: req.user._id, access: ["admin"]}
			],
			fileExtension: fileExtension,
			mediaType: mediaType
		});

		var imageNameWithoutExtension = utils.cleanFilename(utils.getFilenameWithoutExtension(originalFilename));
		var finalName = imageNameWithoutExtension + '-' + image._id + '.'  + fileExtension;
		image.name = finalName;

		image.save(function (err) {
			if (err) {
				return callback(err);
			}

			project.images.addToSet(image);
			images.push(image);

			// Move uploaded image from uploadDir to project dir
			var projectDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + project._id);
			var dstImagesDir = path.join(projectDir, conf.epub.imagesDir);
			var dstImage = path.join(dstImagesDir, finalName);

			var dstImageWriteStream = fs.createWriteStream(dstImage);
			fs.createReadStream(file.path).pipe(dstImageWriteStream);

			dstImageWriteStream.on('error', function (err) {
				return callback(err);
			});

			dstImageWriteStream.on('finish', function () {
				return callback(null);
			});
            // TODO: On multiple file upload - Do proper cleanup of successfully copied files, if some error happens.
		});
	}, function (err) {
		if (err) {
			return next(err);
		}

		project.save(function (err) {
			if (err) {
				return next(err);
			}

			// Image(s) was correctly uploaded and stored on project.
			// As a background task update the user's storageUsed value.
			// Don't wait for it - customer will just be happy if it fails.
			User.update({_id: req.user._id}, {$inc: {storageUsed: totalBytes}}, function (err, numAffected) {
				if (err) {
					logger.error("Could not update users storageUsed value: " + err, req.user);
				}
			});

			res.send({images: images});
		})
	});

}

exports.get = function(req, res, next) {
	var filename = req.params[0];
	if (filename) {
		Image.findOne({"projectId": req.project._id, "name": filename}, function (err, image) {
			if (err) {
				return next(err);
			}

			if (!image) {
				return next({message: "Image not found", status: 404});
			}
			if (!utils.hasAccessToModel(req.user, image)) return next(403);

			var projectDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + req.project._id);
			var imagesDir = path.join(projectDir, conf.epub.imagesDir);
			var imagePath = path.join(imagesDir, image.name);

			//res.sendfile is deprecated
			res.sendfile(imagePath);
		});

	} else {
		return next({message: "Image not found", status: 404});
	}
}