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
 * Check if a Mongoose model object (something with an "_id" attribute) exists in the array of objects.
 *
 * @param objects
 * @param objectToLookFor
 * @returns {boolean}
 */
exports.containsModel = function (objects, objectToLookFor) {
	var result = false;
	if (objects) {
		for (var i=0; i<objects.length; i++) {
			var object = objects[i];
			if (object && object._id == objectToLookFor._id) {
				result = true;
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
