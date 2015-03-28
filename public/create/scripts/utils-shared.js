(function(service) {

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = service;
	} else if (typeof angular !== 'undefined' && angular) {
		angular.module('utilsSharedModule', []).factory(
				'utilsService', function() {
					return service;
				});
	} else {
		this.utils = service;
	}

}(function() {

	/**
	 * Get style contents from the "Style" Mongo model JSON.
	 *
	 * @param style
	 * @param stylesetId
	 * @param isDefault
	 * @returns {string}
	 */
	function getStyleContentsFromScriplerJSON(style, stylesetId, isDefault) {
		var styleContents = "";
		if (style._id && style.css) {
			if (!isDefault) {
				styleContents += ".styleset-" + stylesetId + " ";
			}
			if (style.tag) {
				styleContents += style.tag;
			}
			if (style.class) {
				styleContents += "." + style.class;
			}
			if (style.tag || style.class) {
				// Style-classes should always overrule styleset-classes,
				// so we force higher CSS specificity by including the body element in the style-class selector.
				styleContents += ", body ";
				if (style.tag) {
					styleContents += style.tag;
				}
			}
			styleContents += ".style-" + style._id + " {\n";
			for ( var cssProperty in style.css) {
				styleContents += cssProperty + ": "
					+ style.css[cssProperty] + ";\n";
			}
			styleContents += "}\n";
		}

		//console.log('styleContents: ' + styleContents);
		return styleContents;
	}

	function getStylesetContents(styleset, isDefault) {
		var stylesetContents = "";
		if (styleset && styleset.styles && styleset.styles.length > 0) {
			for (var j = 0; j < styleset.styles.length; j++) {
				var style = styleset.styles[j];
				//console.log('style: ' + JSON.stringify(style));
				stylesetContents += getStyleContentsFromScriplerJSON(style, styleset._id, isDefault);
			}
		}
		return stylesetContents;
	}

	/**
	 * Check if two Mongoose objects are idential based on _id.
	 *
	 * @param obj1 Either ObjectId, _id string, or complete Mongoose object
	 * @param obj2 Either ObjectId, _id string, or complete Mongoose object
	 * @returns {boolean}
	 */
	function mongooseEquals(obj1, obj2) {
		return getMongooseId(obj1) == getMongooseId(obj2);
	}

	/**
	 * Get the Mongoose id of an object (if any)
	 *
	 * @param can be either ObjectId, _id string, or complete Mongoose object
	 * @returns obj Mongoose primitive ObjectId _id of object.
	 */
	function getMongooseId(obj) {
		var ret = null;
		if (!obj) {
			ret = null;
		} else if (typeof obj == 'string') {
			ret = obj;
		} else if (obj instanceof String) {
			ret = obj.valueOf();
		} else if (obj.constructor && obj.constructor.name == 'ObjectID') {
			ret = obj.toString();
		} else if (typeof obj == 'object' && obj._id) {
			ret = obj._id;
		} else {
			throw new Error('Unknown object in getMongooseId: ' + obj);
		}
		return ret;
	}

	/**
	 *
	 * Check if a Mongoose model object/id exists in the array of objects.
	 *
	 * @param objects
	 * @param objectId
	 * @returns {boolean}
	 */
	function containsModel(objects, objectId) {
		var result = false;
		if (objects) {
			for (var i=0; i<objects.length; i++) {
				var object = objects[i];
				if (object) {
					if (mongooseEquals(object, objectId)) {
						result = true;
						break;
					}
				}
			}
		}
		return result;
	}

	/**
	 * Check if one of the documents exist in the specified folder.
	 *
	 * @param documents
	 * @param folderId
	 * @returns {boolean}
	 */
	function containsDocWithFolderId(documents, folderId) {
		var result = false;
		for (var i = 0; i < documents.length; i++) {
			if (documents[i].folderId == folderId) {
				result = true;
				break;
			}
		}
		return result;
	}

	function isValidEmail(email) {
		var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
		return re.test(email);
	}


	/**
	 * Split up a name into parts: first and last name.
	 *
	 * @param name
	 * @param next
	 */
	function getNameParts(name) {
		if (!name) return;
		var nameParts = {};
		var names = name.split(" ");

		// First name
		if (names && names.length > 1) {
			nameParts.firstname = names[0];

			// Last name
			var lastname = "";
			for (var i=1; i < names.length; i++) {
				lastname += names[i] + " ";
			}
			nameParts.lastname = lastname.trim();
		} else {
			nameParts.firstname = name;
		}

		return nameParts;
	}

	/**
	 * Copied from http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
	 *
	 * @param length
	 * @returns {string}
	 */
	function createRandomString (length) {
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for (var i=0; i<length; i++)
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		return text;
	}

	var maxNumberOfProjects = {
		"free": 5,
		"premium": 500,
		"professional": 5000
	};

	/**
	 * Can a user with "userLevel" and "projectIds" create a new project?
	 *
	 * @param userLevel
	 * @param projectIds
	 * @returns {boolean}
	 */
	function canCreateProject(userLevel, projectIds) {
		if (!userLevel) return false;
		if (!maxNumberOfProjects[userLevel]) return false;
		if (!projectIds) return true;
		if (projectIds.length < maxNumberOfProjects[userLevel]) return true;
		return false;
	}

	/**
	 * Is a user with "userLevel" and "projectIds" allowed to load "projectIdToCheck"?
	 *
	 * @param userLevel
	 * @param projectIds
	 * @param projectIdToCheck
	 * @returns {boolean}
	 */
	function canLoadProject(userLevel, projectIds, projectIdToCheck) {
		if (!userLevel) return false;
		if (!maxNumberOfProjects[userLevel]) return false;

		// The user is allowed to load any of his/her projects, if he/she has fewer than the max
		if (projectIds && projectIds.length <= maxNumberOfProjects[userLevel] && projectIds.indexOf(projectIdToCheck) > -1) return true;

		// Since the first four bytes of a Mongo id represents a creation timestamp, we can use this to sort by date.
		var sortedProjectIds = projectIds.sort();
		var firstXProjectIds = sortedProjectIds.slice(0, maxNumberOfProjects[userLevel]);
		return firstXProjectIds.indexOf(projectIdToCheck) > -1;
		return false;
	}

	return {
		getStylesetContents : getStylesetContents,
		mongooseEquals : mongooseEquals,
		getMongooseId : getMongooseId,
		containsModel : containsModel,
		containsDocWithFolderId: containsDocWithFolderId,
		isValidEmail: isValidEmail,
		getNameParts: getNameParts,
		createRandomString : createRandomString,
		canCreateProject : canCreateProject,
		canLoadProject: canLoadProject
	}

}()))
