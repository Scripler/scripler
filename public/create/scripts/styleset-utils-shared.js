(function( service ) {

		if (typeof module !== 'undefined' && module.exports ) {
			module.exports = service;
		} else if ( angular ) {
			angular.module('stylesetUtilsSharedModule', [])
				.factory('stylesetUtilsService', function() { return service; } );
		}

	} (function() {

		function getStylesetContents( styleset ) {
			var stylesetContents;

			if (styleset && styleset.styles != null && styleset.styles.length > 0) {
				for (var j=0; j<styleset.styles.length; j++) {
					var style = styleset.styles[j];
					stylesetContents += style.css + '\n';
				}
			}

			return stylesetContents;
		};

		return { getStylesetContents: getStylesetContents }

	}())
)
