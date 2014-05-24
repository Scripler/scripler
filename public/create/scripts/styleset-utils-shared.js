(function( service ) {

		if (typeof module !== 'undefined' && module.exports ) {
			module.exports = service;
		} else if ( angular ) {
			angular.module('stylesetUtilsSharedModule', [])
				.factory('stylesetUtilsService', function() { return service; } );
		}

	} (function() {

		function getStylesetContents( styleset, isDefault ) {
			var stylesetContents = "";

			if (styleset && styleset.styles && styleset.styles.length > 0) {
				for (var j=0; j<styleset.styles.length; j++) {
					var style = styleset.styles[j];
					if (style.tag) {
	                    if (!isDefault) {
	                        stylesetContents += ".styleset-" + styleset._id + " ";
	                    }
	                    stylesetContents += style.tag + ", ";
	                }
	                stylesetContents += ".style-" + style._id + " {\n";
	                for (var cssProperty in style.css) {
	                    stylesetContents += cssProperty + ": " + style.css[cssProperty] + ";\n";
	                }
	                stylesetContents += "}\n";
				}
			}

			return stylesetContents;
		};

		return { getStylesetContents: getStylesetContents }

	}())
)
