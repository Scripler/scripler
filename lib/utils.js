var path = require('path');
var mediaTypes = require(path.resolve(__dirname, '.', 'mediaTypes.json'));
var utils_shared = require('../public/create/scripts/utils-shared');

function getEmbeddedDocument(arr, queryField, search) {
	var len = arr.length;
	while (len--) {
		if (arr[len][queryField] === search) {
			return arr[len];
		}
	}
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
				//console.log('isCopyOfPrivate (!= undefined) result: ' + result + '. Original: ' + original + ', Copy: ' + copy);
			} else {
				//console.log('isCopyOfPrivate (undefined) result: ' + result + '. Original: ' + original + ', Copy: ' + copy);
				//console.log("DEBUG: copy " + copy.name + " (" + copy._id + ") does not have an \"original\" attribute, so it does not appear to be a copy of anything (tihs is fine: we are just TESTING if 'copy' is a copy of 'original')");
				//console.log("copy: " + JSON.stringify(copy));
			}
		} else {
			// TODO: throw an exception OR return the error via a "next" function
			console.log("ERROR: invalid argument: \"original\" must be Mongoose a model object");
			//console.log("original: " + JSON.stringify(original));
		}
	} else {
		console.log('WARN: original and/or copy are null');
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
	//console.log(ext);
	return filenameParts[filenameParts.length - 1];
}

exports.getFilenameWithoutExtension = function (filename) {
	var filenameParts = filename.split('.');
	//console.log(filenameParts);
	return filenameParts[0];
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