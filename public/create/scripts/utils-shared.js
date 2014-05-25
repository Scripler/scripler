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

	function getStylesetContents(styleset, isDefault) {
		var stylesetContents = "";

		if (styleset && styleset.styles && styleset.styles.length > 0) {
			for (var j = 0; j < styleset.styles.length; j++) {
				var style = styleset.styles[j];
				if (style._id && style.css) {
					if (style.tag) {
						if (!isDefault) {
							stylesetContents += ".styleset-" + styleset._id + " ";
						}
						stylesetContents += style.tag;
					}
					if (style.class) {
						stylesetContents += "." + style.class;
					}
					if (style.tag || style.class) {
						stylesetContents += ", ";
					}
					stylesetContents += ".style-" + style._id + " {\n";
					for ( var cssProperty in style.css) {
						stylesetContents += cssProperty + ": "
								+ style.css[cssProperty] + ";\n";
					}
					stylesetContents += "}\n";
				}
			}
		}

		return stylesetContents;
	}

    // Check if two Mongoose objects are idential based on _id.
    // Input objects can be either ObjectId, _id string, or complete Mongoose object.
    function mongooseEquals( obj1, obj2 ) {
        return getMongooseId(obj1) == getMongooseId(obj2);
    }

    // Return Mongoose primitive ObjectId _id of object.
    // Input object can be either ObjectId, _id string, or complete Mongoose object.
    function getMongooseId( obj ) {
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

	return {
		getStylesetContents : getStylesetContents,
        mongooseEquals : mongooseEquals,
        getMongooseId : getMongooseId
	}

}()))
