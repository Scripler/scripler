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
	;

	return {
		getStylesetContents : getStylesetContents
	}

}()))
