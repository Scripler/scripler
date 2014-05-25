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
		var name = imagePrefix + file.originalFilename;
		var fileExtension = utils.getFileExtension(file.originalFilename);
		var mediaType = utils.getMediaType(fileExtension);
		var url = conf.app.url_prefix + '/users/' + req.user._id + '/projects/' + project._id + '/images/' + name;

		var image = new Image({
			name: name,
			projectId: project._id,
			members: [
				{userId: req.user._id, access: ["admin"]}
			],
			fileExtension: fileExtension,
			mediaType: mediaType,
			url: url
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

			fs.createReadStream(file.path).pipe(fs.createWriteStream(dstImage));

			return callback(null);
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