var path = require('path');
var mediaTypes = require(path.resolve(__dirname, '.', 'mediaTypes.json'))

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
 *
 * Check if a Mongoose model object id exists in the array of objects.
 *
 * @param objects
 * @param objectId
 * @returns {boolean}
 */
var containsIdPrivate = function (objects, objectId) {
	var result = false;
	if (objects) {
		for (var i=0; i<objects.length; i++) {
			var object = objects[i];
			if (object) {
				if ('object' == typeof object && 'string' == typeof objectId) {
					if (object._id != undefined) {
						// A Mongoose model object ids does not have an "equals" function, so we use ==
						if (object._id == objectId) {
							result = true;
							break;
						}
					}
				} else {
					console.log("WARN: invalid arguments: must be of type \'object\' array and 'string' (Mongoose model object id)");
				}
			}
		}
	}
	return result;
}

// TODO: how is this normally named/handled in JavaScript?
exports.containsId = containsIdPrivate;

/**
 *
 * Check if a Mongoose model object (something with an "_id" (or "id") attribute) exists in the array of objects.
 *
 * @param objects
 * @param objectToLookFor
 * @returns {boolean}
 */
exports.containsModel = function (objects, objectToLookFor) {
	return containsIdPrivate(objects, objectToLookFor);
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
				result = original._id.equals(copy.original);
			} else {
				console.log("DEBUG: copy " + copy.name + " (" + copy._id + ") does not have an \"original\" attribute, so it does not appear to be a copy of anything");
				//console.log("copy: " + JSON.stringify(copy));
			}
		} else {
			console.log("ERROR: invalid argument: \"original\" must be Mongoose a model object");
			//console.log("original: " + JSON.stringify(original));
		}
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
 * If so, return the copy.
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
			if (isCopyOfPrivate(copy, original)) {
				result = copy;
				break;
			}
		}
	}

	return result;
}

// Copied from http://stackoverflow.com/questions/10865347/node-js-get-file-extension
exports.getFileExtension = function (filename) {
	var ext = path.extname(filename || '').split('.');
	return ext[ext.length - 1];
}

exports.getMediaType = function (fileExtension) {
	return mediaTypes[fileExtension];
}

//check if a string is empty, null or undefined
exports.isEmpty = function ( str ) {
	return (!str || 0 === str.length);
}
