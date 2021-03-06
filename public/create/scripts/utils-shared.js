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

	function getCombinedStylesetContents(stylesets, defaultStyleset) {
		var combinedCSS = '';
		for (var i = 0; i < stylesets.length; i++) {
			if (defaultStyleset == stylesets[i]._id) {
				combinedCSS += getStylesetContents(stylesets[i], true);
			} else {
				combinedCSS += getStylesetContents(stylesets[i], false);
			}
		}
		return combinedCSS;
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

	// TODO: should this be duplicated in config/<env>.json because we want to be able to change it without making a release?
	// TODO: how to make this configurable for test?
	var subscriptions = {
		"free": {
			"maxNumberOfProjects": 3,
			"maxNumberOfDesigns": 3
		},
		"premium": {
			"maxNumberOfProjects": 10,
			"maxNumberOfDesigns": 17,
			"monthlyPrice": "9.99"
		},
		"professional": {
			"maxNumberOfProjects": 100
		}
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
		if (!subscriptions[userLevel]) return false;
		if (!projectIds) return true;
		if (projectIds.length < subscriptions[userLevel].maxNumberOfProjects) return true;
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
		if (!subscriptions[userLevel]) return false;

		var maxNumberOfProjects = subscriptions[userLevel].maxNumberOfProjects;

		// Since the first four bytes of a Mongo id represents a creation timestamp, we can use this to sort by date.
		// First, make a copy to avoid changing the input parameter
		var projectIdsCopy = projectIds.slice();
		var sortedProjectIds = projectIdsCopy.sort();
		var firstXProjectIds = sortedProjectIds.slice(0, maxNumberOfProjects);
		// TODO: implement not using indexOf(), since we want to compare values not references? (see http://stackoverflow.com/questions/19737408/mongoose-check-if-objectid-exists-in-an-array)
		return JSON.stringify(firstXProjectIds).indexOf(projectIdToCheck.toString()) > -1;
	}

	return {
		getStylesetContents : getStylesetContents,
		getCombinedStylesetContents: getCombinedStylesetContents,
		mongooseEquals : mongooseEquals,
		getMongooseId : getMongooseId,
		containsModel : containsModel,
		containsDocWithFolderId: containsDocWithFolderId,
		isValidEmail: isValidEmail,
		getNameParts: getNameParts,
		createRandomString : createRandomString,
		canCreateProject : canCreateProject,
		canLoadProject: canLoadProject,
		subscriptions: subscriptions
	}

}()))
