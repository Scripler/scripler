var fs = require('fs');
var path = require('path');
var cssparser = require("cssparser");
var parser = new cssparser.Parser();
var mongoose = require('mongoose');
var conf = require('config');
var async = require('async');
var Styleset = require('../models/styleset.js').Styleset;
var Style = require('../models/style.js').Style;
var cssNames = require(path.join(__dirname, '../lib/css-names.json'));

function createStyleset(stylesheetName, jsonStyleset, next) {
	var styleset = new Styleset({
		name: stylesheetName,
		isSystem: true
	});

	styleset.save(function (err, styleset) {
		if (err) {
			return next(err);
		}

		// TODO: will the styles always be inside a 'rulelist'?
		var jsonStyles = jsonStyleset['rulelist'];

		async.each(jsonStyles, function (jsonStyle, callback) {
			var type = jsonStyle['type'];
			if (type) {
				var name;
				var clazz;
				var tag;

				if (type == 'fontface') {
					console.log('Skipping "fontface" style...(should be added as non-editable CSS (that is only included if used))');
					callback(null);
				} else if (type == 'style') {
					var selector = jsonStyle['selector'];
					var isClass = selector.indexOf('.') == 0;

					if (isClass) {
						clazz = selector.slice(1);
						name = cssNames[clazz];
					} else {
						tag = selector;
						name = cssNames[tag];
					}

					var declarations = jsonStyle['declarations'];

					var style = new Style({
						name: name,
						class: clazz,
						css: declarations,
						tag: tag,
						stylesetId: styleset._id,
						isSystem: true
					});

					style.save(function (err, style) {
						if (err) {
							callback(err);
						}

						styleset.styles.addToSet(style);
						callback(null);
					});
				}
			} else {
				callback('"type" empty');
			}
		}, function (err) {
			if (err) {
				return next(err);
			}

			// The styles we just created were also added to the styleset so we must save the styleset again
			styleset.save(function (err, styleset) {
				if (err) {
					return next(err);
				}

				return next(null, styleset);
			});

		});
	});
}

// TODO: read all stylesheets (.css files) in the system stylesets dir
var stylesheetName = 'simplecolor';
var cssFilename = path.join(__dirname, '../public/create/stylesets/' + stylesheetName + '.css');
console.log(cssFilename);

var css = fs.readFileSync(cssFilename, 'utf8');
//console.log(css);

var json = parser.parse(css);
//console.log("JSON:\n " + JSON.stringify(json, null, '\t'));

mongoose.connect(conf.db.uri);

createStyleset(stylesheetName, json, function (err, styleset) {
	if (err) {
		console.log(err);
		process.exit(1);
	}

	console.log('Created and saved styleset ' + styleset);
	process.exit(0);
});