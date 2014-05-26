var conf = require('config');
var Image = require('../models/image.js').Image;
var Project = require('../models/project.js').Project;
var utils = require('../lib/utils');
var async = require('async');
var path = require('path');
var mkdirp = require('mkdirp');
var fs = require('fs');

exports.create = function (req, res, next) {
	var project = req.project;
	var imagePrefix = conf.epub.imagePrefix;

	var files = req.files.file;
	if (!(files instanceof Array)) {
		files = [files];
	}

	var images = [];

	async.each(files, function (file, callback) {
		var name = file.originalFilename;
		var fileExtension = utils.getFileExtension(file.originalFilename);
		var mediaType = utils.getMediaType(fileExtension);

		var image = new Image({
			name: name,
			projectId: project._id,
			members: [
				{userId: req.user._id, access: ["admin"]}
			],
			fileExtension: fileExtension,
			mediaType: mediaType,
		});

		image.save(function (err) {
			if (err) {
				return callback(err);
			}

			project.images.addToSet(image);
			images.push(image);

			// TODO: check that the user has enough free space

			// Move uploaded image from uploadDir to project dir
			var projectDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + project._id);
			var dstImagesDir = path.join(projectDir, conf.epub.imagesDir);
			var dstImage = path.join(dstImagesDir, name);

			var dstImageWriteStream = fs.createWriteStream(dstImage);
			fs.createReadStream(file.path).pipe(dstImageWriteStream);

			dstImageWriteStream.on('error', function (err) {
				return callback(err);
			});

			dstImageWriteStream.on('finish', function () {
				return callback(null);
			});
		});
	}, function (err) {
		if (err) {
			return next(err);
		}

		project.save(function (err) {
			if (err) {
				return next(err);
			}

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

			res.sendfile(imagePath);
		});

	} else {
		return next({message: "Image not found", status: 404});
	}
}