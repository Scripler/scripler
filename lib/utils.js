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
 * Does the user have access to the entity, e.g. project or document?
 */
exports.hasAccessToEntity = function (user, entity, access) {
	if (!user || !user._id || !entity || !entity.members) return false;
	access = access || "admin";
	var memberObj = getEmbeddedDocument(entity.members, "userId", user._id.toString()) || {};
	var accessArray = memberObj.access || [];
	return accessArray.indexOf(access) >= 0;
}

// Copied from http://stackoverflow.com/questions/10865347/node-js-get-file-extension
exports.getFileExtension = function (filename) {
	var ext = path.extname(filename || '').split('.');
	return ext[ext.length - 1];
}

exports.getMediaType = function (fileExtension) {
	return mediaTypes[fileExtension];
}
