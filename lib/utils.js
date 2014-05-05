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
			if (object && object._id == objectId) {
				result = true;
				break;
			}
		}
	}
	return result;
}

// TODO: how is this normally named/handled in JavaScript?
exports.containsId = containsIdPrivate;

/**
 *
 * Check if a Mongoose model object (something with an "_id" attribute) exists in the array of objects.
 *
 * @param objects
 * @param objectToLookFor
 * @returns {boolean}
 */
exports.containsModel = function (objects, objectToLookFor) {
	return containsIdPrivate(objects, objectToLookFor._id);
}

/**
 * Check if "copy" is copied from "original", i.e. where original.original == copy._id (or id).
 *
 * @param original
 * @param copy
 */
function isCopyOf (original, copy) {
	var result = false;
	if (original != null && copy != null) {
		// Non-populated model objects
		if (original.hasOwnProperty("id")) {
			result = original.original == copy.id;
			// Populated model objects
		} else if (original.hasOwnProperty("_id")) {
			result = original.original == copy._id;
		}
	}
	return result;
}

/**
 * Check if an array of Mongoose model objects contains a copy of a model object.
 *
 * @param objects
 * @param copy
 * @returns {boolean}
 */
exports.containsCopy = function (objects, copy) {
	var result = false;
	if (objects) {
		for (var i=0; i<objects.length; i++) {
			var original = objects[i];
			result = isCopyOf(original, copy);
			if (result) break;
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
