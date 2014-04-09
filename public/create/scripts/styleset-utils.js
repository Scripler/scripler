(function(exports){

	exports.getStylesetContents = function (styleset) {
		var stylesetContents;

		if (styleset && styleset.styles != null && styleset.styles.length > 0) {
			for (var j=0; j<styleset.styles.length; j++) {
				var style = styleset.styles[j];
				stylesetContents += style.css + '\n';
			}
		}

		return stylesetContents;
	};

})(typeof exports === 'undefined' ? this['styleset-utils'] = {} : exports);