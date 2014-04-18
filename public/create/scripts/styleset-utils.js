var fs = require('fs');
var path = require('path');

(function(exports){

	exports.getNonEditableCss = function () {
		var nonEditableCssFilename = path.resolve(__dirname, '../stylesets', 'non-editable.css');
		var nonEditableCss = fs.readFileSync(nonEditableCssFilename);
		return nonEditableCss;
	};

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