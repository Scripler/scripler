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
var filewalker = require('filewalker');
var utils = require('../lib/utils');
var styleset_utils = require('../lib/styleset-utils');
var logger = require('../lib/logger');

function createStyleset(stylesheetName, jsonStyleset, order, next) {
	var styleset = new Styleset({
		name: stylesheetName,
		isSystem: true,
		accessLevels: ["premium", "professional"],
		order: order
	});

	// Define the freemium stylesets
	if (["book-bw", "book-color", "future-bw", "future-color", "light-bw", "light-color", "simple-bw", "simple-color"].indexOf(stylesheetName) >= 0) {
		styleset.accessLevels = ["free", "premium", "professional"];
	}

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
				var hidden;

				if (type == 'fontface') {
					logger.info('Skipping "fontface" style...(should be added as non-editable CSS (that is only included if used))');
					callback(null);
				} else if (type == 'style') {
					var selector = jsonStyle['selector'];

					var tagAndClassRegex = /(\w+)\.(\w+)/;
					var tagAndClass = tagAndClassRegex.exec(selector);
					if (tagAndClass && tagAndClass.length > 1) {
						tag = tagAndClass[1];
						clazz = tagAndClass[2];

						if (cssNames[tag]) {
							name = cssNames[tag].name;
						} else {
							name = tag;
							hidden = true;
						}
					} else {
					var isClass = selector.indexOf('.') == 0;

					if (isClass) {
						clazz = selector.slice(1);
						if (cssNames[clazz]) {
							name = cssNames[clazz].name;
							// "Insert system styles" do not need a human-readable name
						} else {
							name = clazz;
							hidden = true;
						}
						//debug('isClazz name: ' + clazz + ', name: ' + name);
					} else {
						tag = selector;
						if (cssNames[tag]) {
							name = cssNames[tag].name;
							// "Insert system styles" do not need a human-readable name
						} else {
							name = tag;
							hidden = true;
						}
						//debug('tag name: ' + tag + ', name: ' + name);
					}
					}

					var declarations = jsonStyle['declarations'];

					var style = new Style({
						name: name,
						class: clazz,
						css: declarations,
						tag: tag,
						stylesetId: styleset._id,
						isSystem: true,
						hidden: hidden
					});

					style.save(function (err, style) {
						if (err) {
							callback(err);
						}

						//debug(stylesheetName + ': created style: ' + JSON.stringify(style));

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

			// Save styleset such that the styles added above can be populated, c.f. comment below
			styleset.save(function (err, savedStyleset) {
				if (err) {
					return next(err);
				}

				// Styles must be populated for sorting to work, see below
				Styleset.findOne({"_id": savedStyleset._id}).populate('styles').exec(function (err, populatedStyleset) {
					if (err) {
						return next(err);
					}

					//debug('BEFORE');
					//debug(JSON.stringify(populatedStyleset.styles));

					populatedStyleset.styles.sort(styleset_utils.systemStyleOrder);

					//debug('AFTER');
					//debug(JSON.stringify(populatedStyleset.styles));

					// The styles we just created were also added to the styleset so we must save the styleset again
					populatedStyleset.save(function (err, savedStyleset) {
						if (err) {
							return next(err);
						}

						return next(null, savedStyleset);
					});
				});
			});
		});
	});
}

mongoose.connect(conf.db.uri);

var systemStylesetsDir = path.join(__dirname, '../public/create/stylesets');

var stylesetFiles = [];

filewalker(systemStylesetsDir, { recursive: false, matchRegExp: /[^non\-editable]\.(css)$/ })
	.on('file', function (stylesetFile) {
		stylesetFiles.push(stylesetFile);
	})
	.on('error', function (err) {
		console.log(err);
		process.exit(1);
	})
	.on('done', function () {
		var order = 0;

		async.eachSeries(stylesetFiles, function (stylesetFile, callback) {
			var stylesheetName = utils.getFilenameWithoutExtension(stylesetFile);
			var cssFilename = path.join(__dirname, '../public/create/stylesets/' + stylesetFile);
			var css = fs.readFileSync(cssFilename, 'utf8');
			var json = parser.parse(css);

			logger.info('Importing ' + cssFilename);

			createStyleset(stylesheetName, json, order++, function (err, styleset) {
				if (err) {
					console.log(err);
					process.exit(1);
				}

				//console.log('Created and saved styleset ' + styleset);
				logger.info('Imported ' + stylesheetName);
				callback(null);
			});
		}, function (err) {
			if (err) {
				console.log(err);
				process.exit(1);
			}

			process.exit(0);
		});
	})
	.walk();

process.on('exit', function() {
	logger.info('Imported all system stylesets from ' + systemStylesetsDir + ' (but check log messages for errors)');
})