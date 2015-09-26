var path = require('path');
var mediaTypes = require(path.resolve(__dirname, '.', 'mediaTypes.json'));
var utils_shared = require('../public/create/scripts/utils-shared');
var logger = require('../lib/logger');
var fs = require('fs');
var conf = require('config');
var webshot = require('webshot');
var lwip = require('lwip');
var Document = require('../models/document.js').Document;
var Styleset = require('../models/styleset.js').Styleset;
var Id = require('../models/id.js').Id;

function getEmbeddedDocument(arr, queryField, search) {
	var len = arr.length;
	while (len--) {
		if (arr[len][queryField] === search) {
			return arr[len];
		}
	}
}

exports.cleanUserObject = function (user) {
	var userClean = user.toObject(); // swap for a plain javascript object instance
	delete userClean["password"];
	if (userClean["payment"] && userClean["payment"]["payments"]) {
		delete userClean["payment"]["payments"];
	}
	return userClean;
}

/**
 *
 * Does the user have access to the given Mongoose model object, e.g. Project or Document?
 *
 * @param user
 * @param object
 * @param access
 * @returns {boolean}
 */

exports.hasAccessToModel = function (user, object, access) {
	if (!user || !user._id || !object || !object.members) return false;
	access = access || "admin";
	var memberObj = getEmbeddedDocument(object.members, "userId", user._id.toString()) || {};
	var accessArray = memberObj.access || [];
	return accessArray.indexOf(access) >= 0;
}

/**
 * Check if "copy" is copied from "original", i.e. where original._id == copy.original.
 *
 * @param original
 * @param copy
 */
var isCopyOfPrivate = function (copy, original) {
	var result = false;
	if (original != null && copy != null) {
		if (original._id != undefined) {
			if (copy.original != undefined) {
				result = utils_shared.mongooseEquals(original._id, copy.original);
				//logger.debug('isCopyOfPrivate (!= undefined) result: ' + result + '. Original: ' + original + ', Copy: ' + copy);
			} else {
				//logger.debug('isCopyOfPrivate (undefined) result: ' + result + '. Original: ' + original + ', Copy: ' + copy);
				//logger.debug("DEBUG: copy " + copy.name + " (" + copy._id + ") does not have an \"original\" attribute, so it does not appear to be a copy of anything (tihs is fine: we are just TESTING if 'copy' is a copy of 'original')");
				//logger.debug("copy: " + JSON.stringify(copy));
			}
		} else {
			// TODO: throw an exception OR return the error via a "next" function
			logger.error("Invalid argument: \"original\" must be Mongoose a model object");
			//logger.debug("original: " + JSON.stringify(original));
		}
	} else {
		logger.warn('Original and/or copy are null');
	}

	return result;
}

exports.isCopyOf = isCopyOfPrivate;

/**
 * Check if an array of Mongoose model objects, originals, contains a copy of a model object.
 *
 * @param originals
 * @param copy
 * @returns {boolean}
 */
exports.containsCopy = function (originals, copy) {
	var result = false;
	if (originals) {
		for (var i=0; i<originals.length; i++) {
			var original = originals[i];
			result = isCopyOfPrivate(copy, original);
			if (result) break;
		}
	}

	return result;
}

/**
 * Check if an array of Mongoose model objects, copies, contains an object which has "original" as its original.
 *
 * @param copies
 * @param original
 * @returns matched object
 */
exports.containsOriginal = function (copies, original) {
	var result = null;

	if (copies != null && copies.length > 0) {
		for (var i=0; i<copies.length; i++) {
			var copy = copies[i];
			result = isCopyOfPrivate(copy, original);
			if (result) break;
		}
	}

	return result;
}

// Copied from http://stackoverflow.com/questions/10865347/node-js-get-file-extension
exports.getFileExtension = function (filename) {
	var filenameParts = path.extname(filename || '').split('.');
	return filenameParts[filenameParts.length - 1].toLowerCase();
}

exports.getFilenameWithoutExtension = function (filename) {
	var filenameParts = filename.split('.');
	return filenameParts[0];
}

// This whitelists characters, instead of blacklisting them as the sanitize module does.
exports.cleanFilename = function (filename) {
	return filename.replace(/[^0-9A-Za-z-_.]+/g, '');
}

exports.getMediaType = function (fileExtension) {
	return mediaTypes[fileExtension];
}

//check if a string is empty, null or undefined
exports.isEmpty = function ( str ) {
	return (!str || 0 === str.length);
}

/**
 * In the input string, replace all occurrences of each key with each value of the input map.
 *
 * @param find
 * @param replace
 * @returns {boolean}
 */
exports.replaceMap = function ( string, map ) {
	var newString = string;
	for (var key in map) {
		if (!map.hasOwnProperty(key)) {
			continue;
		}
		newString = newString.replace(new RegExp(key, "g"), map[key]);
	}
	return newString;
}

/**
 * Get's a YYYY-MM-DD string date as input, add the amount of days, and return in the same formast.
 * @param date
 * @param days
 * @returns {string}
 */
exports.addDaysToDate = function (date, days) {
	if (!date || typeof date !== "string") {
		return null;
	}
	date = new Date(date);
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
}

exports.copyFile = function (source, target, cb) {
	var rd = fs.createReadStream(source);
	rd.on("error", function(err) {
		return cb(err);
	});
	var wr = fs.createWriteStream(target);
	wr.on("error", function(err) {
		return cb(err);
	});
	wr.on("close", function(ex) {
		return cb();
	});
	rd.pipe(wr);
}

var getRenderableHTML = exports.getRenderableHTML = function (document, stylesets) {
	return '<html><head><base href="' + conf.app.url_prefix + 'create/" />' +
		'<link type="text/css" rel="stylesheet" href="stylesets/non-editable.css"><style>' +
		utils_shared.getCombinedStylesetContents(stylesets, document.defaultStyleset) +
		'</style></head><body id="scripler" class="styleset-' + document.defaultStyleset + '">' +
		document.text +
		'</body></html>';
}

exports.generatePreview = function (project, imagePath, next) {
	if (project.metadata.cover) {
		//Cover image present, so resize it and use that
		var srcImage = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + project.id, conf.epub.imagesDir, project.metadata.cover.split('/')[1]);

		lwip.open(srcImage, function(err, image){
			if (err) {
				return next(err);
			}
			var targetRatio = conf.publish.screenshot.height / conf.publish.screenshot.width;
			var sourceRatio = image.height() / image.width();
			var resizeRatio;
			if (targetRatio > sourceRatio) {
				// Source is wider in ratio, so resize after height. Some width will be cropped.
				resizeRatio = conf.publish.screenshot.height / image.height();
			} else {
				// Source is higher in ratio, so resize after width. Some height will be cropped.
				resizeRatio = conf.publish.screenshot.width / image.width();
			}

			image.resize(image.width() * resizeRatio, image.height() * resizeRatio, function(err, image){
				if (err) {
					return next(err);
				}
				image.crop(0, 0, conf.publish.screenshot.width, conf.publish.screenshot.height, function(err, image) {
					if (err) {
						return next(err);
					}
					image.writeFile(imagePath, 'jpg', function(err){
						if (err) {
							return next(err);
						}
						return next();
					});
				});

			});
		});

	} else {
		// No cover image, so we will create a screenshot
		// Load the document used to generate sceenshot of

		// We use first unarchived document for screenshot. If none are found (weird user!), we default to first document.
		var firstDocument = project.documents[0].id;
		for (var i=0; i < project.documents.length; i++) {
			if (!project.documents[i].archived) {
				firstDocument = project.documents[i].id;
				break;
			}
		}
		Document.findOne({"_id": firstDocument, "deleted": false}, function (err, document) {
			if (err) {
				return next(err);
			}
			// Load the styles applied to that document
			Styleset.find({"_id": {"$in": document.stylesets}}).populate('styles').exec(function (err, stylesets) {
				if (err) {
					return next(err);
				}

				var html = getRenderableHTML(document, stylesets);

				logger.debug('Screenshot HTML: ' + html);
				webshot(html, imagePath, {
					siteType: 'html',
					windowSize: {
						width:  conf.publish.screenshot.width,
						height: conf.publish.screenshot.height
					},
					defaultWhiteBackground: true,
					zoomFactor: conf.publish.screenshot.zoom,
					timeout: 5000 //ms
				}, function (err) {
					if (err) {
						return next(err);
					}
					logger.debug("Webshot done");
					return next();
				});
			});
		});
	}
}

exports.cleanUrlPart = function (part) {
	return part.replace(/[\s\/\\#?-]+/g, "")
}

exports.getNextId = function (idName, next) {
	Id.findOneAndUpdate({id: idName}, { $inc: { seq: 1 } }, {new: true, upsert: true}, function (err, id) {
		if (err) {
			//console.log(err);
			return next(err);
		}
		next(null, 1000 + id.seq);
	})
}