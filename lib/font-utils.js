var utils = require('./utils');
var async = require('async');
var cssparser = require("cssparser");
var parser = new cssparser.Parser();
var conf = require('config');
var utils_shared = require('../public/create/scripts/utils-shared');
var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var Font = require('../models/font.js').Font;
var endOfLine = require('os').EOL;

/**
 * Are two fonts equal?
 *
 * @param font1
 * @param font2
 * @returns {*}
 */
function equals (font1, font2) {
	if (!font1 && !font2) return true;
	return font1 && font2 && font1.family == font2.family && font1.style == font2.style && font1.weight == font2.weight;
}

/**
 * Does "fonts" contain "fontToCompare"?
 *
 * @param fonts
 * @param fontToCompare
 * @returns {*}
 */
function contains(fonts, fontToCompare) {
	var result;

	if (fonts && fonts.length > 0) {
		for (var i=0; i<fonts.length; i++) {
			var font = fonts[i];
			//console.log('font: ' + JSON.stringify(font));
			//console.log('fontToCompare: ' + JSON.stringify(fontToCompare));
			result = equals(font, fontToCompare);
			if (result) break;
		}
	}

	return result;
}

function getFont(declarations) {
	return {
		family: declarations['font-family'].replace(/"/g, ""), // TODO: This sucks! How to avoid it?
		style: declarations['font-style'],
		weight: declarations['font-weight'],
		src: declarations['src'].replace(/\\/g, "") // TODO: same as above
	};
}

/**
 *
 * Remove a font-face definition from the CSS via the value of the font-face "src".
 *
 * TODO: implement via via String.replace(), replacing the lines of a @font-face definition with an empty string)?
 *
 * This strategy was chosen because according to Mozilla Developer Network (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace),
 * multi-line match ('m') does not work in V8 (i.e. Node.js). But it appears, c.f. "Remove two or more empty lines" in removeUnusedFonts() that it does!
 *
 * @param fontSrc
 * @param css
 */
function removeFontFromCss(fontSrc, css) {
	if (fontSrc && css) {
		var srcStart = css.indexOf(fontSrc);
		var prefix = css.substring(0, srcStart);
		var fontFaceStart = prefix.lastIndexOf("@font-face");

		// TODO: calculate this in a better way
		var fontFaceEnd = css.lastIndexOf(fontSrc) + fontSrc.length + 4;
		css = css.slice(0, fontFaceStart) + css.slice(fontFaceEnd);
		return css;
	}
}

/**
 * Remove fonts from CSS not used in any document in a project, i.e.:
 *
 * CSS + fonts in use (Scripler JSON) -> CSS
 *
 * For each font in CSS, if font is not found in "fonts in use", remove it from CSS.
 *
 * @param css
 * @param fontsInUse
 * @param ebookGeneration
 * @param next
 */
exports.removeUnusedFonts = function (css, fontsInUse, ebookGeneration, next) {
	var nonEditableJson = parser.parse(css);
	var jsonStyles = nonEditableJson['rulelist'];

	//console.log('jsonStyles: ' + JSON.stringify(jsonStyles));
	//console.log('jsonStyles.length: ' + jsonStyles.length);

	/*
	for (var i=0; i<jsonStyles.length; i++) {
		var jsonStyle = jsonStyles[i];
		var type = jsonStyle['type'];
		if (type) {
			var declarations = jsonStyle['declarations'];
			//console.log('declarations: ' + JSON.stringify(declarations));

			if (type == 'fontface') {
				var font = getFont(declarations);
				var fontInUse = contains(fontsInUse, font);
				if (!fontInUse) {
					//console.log('DEBUG: font ' + JSON.stringify(font) + ' not in use, removing it...');
					var fontSrc = declarations['src'];
					css = removeFontFromCss(fontSrc, css);
				} else {
					//console.log('DEBUG: font ' + JSON.stringify(font) + ' IS in use, skipping it...');
				}
			}
		} else {
			console.log('WARN: "type" empty');
			continue;
		}
	}

	if (ebookGeneration) {
		//console.log('DEBUG: running in "ebook mode" - adjusting path to "Fonts" directory');
		css = css.replace(/Fonts/g, '../' + conf.epub.fontsDir);
	}

	return next(null, css);
	*/

	async.each(jsonStyles, function (jsonStyle, callback) {
		//console.log('jsonStyle: ' + JSON.stringify(jsonStyle));
		var type = jsonStyle['type'];
		if (type) {
			var declarations = jsonStyle['declarations'];
			//console.log('declarations: ' + JSON.stringify(declarations));

			if (type == 'fontface') {
				var font = getFont(declarations);
				var fontInUse = contains(fontsInUse, font);
				if (!fontInUse) {
					//console.log('DEBUG: font ' + JSON.stringify(font) + ' not in use, removing it...');
					var fontSrc = declarations['src'];
					css = removeFontFromCss(fontSrc, css);
				} else {
					//console.log('DEBUG: font ' + JSON.stringify(font) + ' IS in use, skipping it...');
				}
			}

			callback(null);
		} else {
			callback('"type" empty');
		}
	}, function (err) {
		if (err) {
			return next(err);
		}

		// Remove multi-line comments (used for e.g. font headings)
		css = css.replace(/\/\*.+\*\//g, "");

		// Remove three or more empty lines in a row with two - to avoid lots of empty lines after removed fonts
		css = css.replace(/^\s*[\r\n]{3,}/gm, endOfLine + endOfLine);

		if (ebookGeneration) {
			//console.log('DEBUG: running in "ebook mode" - adjusting path to "Fonts" directory');
			css = css.replace(/Fonts/g, '../' + conf.epub.fontsDir);
		}

		return next(null, css);
	});
};


function createFonts(fontsFilename, jsonFonts, next) {
	var fonts = [];

	// TODO: will the styles always be inside a 'rulelist'?
	var jsonStyles = jsonFonts['rulelist'];
	async.each(jsonStyles, function (jsonStyle, callback) {
		var type = jsonStyle['type'];
		if (type) {
			if (type == 'fontface') {
				var declarations = jsonStyle['declarations'];
				//console.log('declarations: ' + declarations);

				var errorMessage;

				var family = declarations['font-family'];
				if (typeof family == 'undefined') {
					errorMessage = 'ERROR: "font-family" attribute not defined - skipping font...';
					console.log(errorMessage);
					callback(errorMessage);
				}

				var style = declarations['font-style'];
				if (typeof style == 'undefined') {
					errorMessage = 'ERROR: "font-style" attribute not defined - skipping font...';
					console.log(errorMessage);
					callback(errorMessage);
				}

				var weight = declarations['font-weight'];
				if (typeof weight == 'undefined') {
					errorMessage = 'ERROR: "font-weight" attribute not defined - skipping font...';
					console.log(errorMessage);
					callback(errorMessage);
				}

				var src = declarations['src'];
				if (typeof src == 'undefined') {
					errorMessage = 'ERROR: "src" attribute not defined - skipping font...';
					console.log(errorMessage);
					callback(errorMessage);
				}

				src = src.replace("url(\"", "");
				src = src.replace("\")", "");

				//console.log('family before: ' + family);
				family = family.replace(/"/g, "");
				//console.log('family after: ' + family);
				var font = new Font({
					family: family,
					style: style,
					weight: weight,
					src: src,
					isSystem: true
				});

				font.save(function (err, font) {
					if (err) {
						callback(err);
					}

					fonts.push(font);
					console.log('Created font: ' + JSON.stringify(font));
					callback(null);
				});
			} else if (type == 'style') {
				console.log('Skipping "normal" style...(use "import_system_stylesets" to import these)');
				callback(null);
			}
		} else {
			callback('"type" empty');
		}
	}, function (err) {
		if (err) {
			return next(err);
		}

		return next(null, fonts);
	});
}

exports.import_system_fonts = function (alreadyConnected, exitWhenDone, next) {
	var fontsFilename = path.join(__dirname, '../public/create/stylesets/non-editable.css');
	//console.log(fontsFilename);

	var css = fs.readFileSync(fontsFilename, 'utf8');
	//console.log(css);

	var json = parser.parse(css);
	//console.log("JSON:\n " + JSON.stringify(json, null, '\t'));

	if (!alreadyConnected) mongoose.connect(conf.db.uri);

	//console.log(mongoose.connection.host);
	//console.log(mongoose.connection.port);
	//console.log(mongoose.connection.db.databaseName);

	createFonts(fontsFilename, json, function (err, fonts) {
		if (err) {
			console.log(err);
			if (exitWhenDone) process.exit(1);
			if (next) return next(err);
		}

		//console.log('Created and saved fonts ' + fonts);
		if (exitWhenDone) process.exit(0);
		if (next) return next();
	});

};