(function(service) {

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = service;
	} else if (angular) {
		angular.module('stylesetUtilsSharedModule', []).factory(
				'stylesetUtilsService', function() {
					return service;
				});
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
			if (style.tag) {
				if (!isDefault) {
					styleContents += ".styleset-" + stylesetId + " ";
				}
				styleContents += style.tag;
			}
			if (style.class) {
				styleContents += "." + style.class;
			}
			if (style.tag || style.class) {
				styleContents += ", ";
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
	 * Get style contents from JSON produced by "cssparser".
	 *
	 * Logic copied from getStyleContentsFromScriplerJSON().
	 *
	 * TODO: merge/combine with getStyleContentsFromScriplerJSON()?
	 *
	 * @param style
	 * @returns {string}
	 */
	function getStyleContentsFromCssparserJSON(style) {
		var styleContents = "";

		// TODO: selector for e.g. ".code + .code" has the value ".code+.code" (no space) - WHY?
		var selector = style['selector'];
		var isClass = selector.indexOf('.') == 0;
		var tag;
		var clazz;

		if (isClass) {
			clazz = selector.slice(1);
		} else {
			tag = selector;
		}

		if (tag) {
			styleContents += tag;
		}

		if (clazz) {
			styleContents += "." + clazz;
		}

		/*
		if (tag || clazz) {
			styleContents += ", ";
		}
		*/

		styleContents += " { \n";
		for (var cssProperty in style.declarations) {
			styleContents += cssProperty + ": " + style.declarations[cssProperty] + ";\n";
		}

		styleContents += "}\n\n";

		//console.log('styleContents: ' + styleContents);
		return styleContents;
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
	 * Check if a Mongoose model object id exists in the array of objects.
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


	return {
		getStyleContentsFromCssparserJSON : getStyleContentsFromCssparserJSON,
		getStylesetContents : getStylesetContents,
        mongooseEquals : mongooseEquals,
        getMongooseId : getMongooseId,
		containsModel : containsModel,
		containsDocWithFolderId: containsDocWithFolderId
	}

}()))
