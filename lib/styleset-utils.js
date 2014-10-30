var fs = require('fs');
var path = require('path');
var utils = require('./utils');
var async = require('async');
var Styleset = require('../models/styleset.js').Styleset;
var isStylesetPopulated = require('../models/styleset.js').isPopulated;
var Style = require('../models/style.js').Style;
var copyStyle = require('../models/style.js').copy;
var copyStyleValues = require('../models/style.js').copyValues;
var isStylePopulated = require('../models/style.js').isPopulated;
var font_utils = require('./font-utils');
var cssNames = require(path.join(__dirname, 'css-names.json'));
var mongoose = require('mongoose');
var cssparser = require("cssparser");
var parser = new cssparser.Parser();
var conf = require('config');
var filewalker = require('filewalker');
var logger = require('../lib/logger');

exports.getNonEditableCss = function (fontsInUse, next) {
	var nonEditableCssFilename = path.resolve(__dirname, '../public/create/stylesets', 'non-editable.css');
	fs.readFile(nonEditableCssFilename, function (err, nonEditableCss) {
		if (err) return next(err);

		font_utils.removeUnusedFonts(nonEditableCss.toString(), fontsInUse, true, function (err, nonEditableCssModified) {
			if (err) return next(err);

			return next(null, nonEditableCssModified);
		});
	});
};

/**
 * Update the values, i.e. name, class and CSS, of the original style with those of the new.
 *
 * The original and new must have the same values but reference different objects in memory.
 *
 * @param originalStyle
 * @param newStyle
 * @param next
 */
exports.updateOriginalStyle = function (originalStyle, newStyle, next) {
	if (isStylePopulated(originalStyle) && isStylePopulated(newStyle)) {
		// TODO: remove this check when implementing "reset" because a document style's original is the user style but the document style is being reset to the system style
		if (newStyle.original == originalStyle.id) {
			copyStyleValues(newStyle, originalStyle);
			return next(null);
		} else {
			return next("Original style can only be updated with styles originating from it => nothing has been updated!");
		}
	} else {
		return next("ERROR: invalid arguments: original style and new style must be non-empty and populated");
	}
};

/**
 * Update the values, i.e. name and styles, of the original styleset with those of the new.
 *
 * The original and new must have the same values but reference different objects in memory.
 *
 * @param originalStyleset
 * @param newStyleset
 * @returns {*}
 */
exports.updateOriginalStyleset = function (originalStyleset, newStyleset, next) {
	if (isStylesetPopulated(originalStyleset) && isStylesetPopulated(newStyleset)) {
		if (!originalStyleset.isSystem) {
			// TODO: remove this check when implementing "reset" because a document styleset's original is the user styleset but the document styleset is being reset to the system styleset
			if (newStyleset.original == originalStyleset.id) {
				// TODO: also update other styleset attributes, e.g. archived, members, etc.?
				originalStyleset.name = newStyleset.name;
				originalStyleset.order = newStyleset.order;

				/*
				 Update any existing styles or remove any missing styles from original?

				 Loop over styles in the original styleset and check if any style is NOT set as original on the new styles: add all new styles that also exist in the original styleset.
				 */
				var newStyles = newStyleset.styles;
				var originalStyles = [];
				if (originalStyleset.styles != null && originalStyleset.styles.length > 0) {
					for (var i=0; i<originalStyleset.styles.length; i++) {
						var originalStyle = originalStyleset.styles[i];
						var matchingNewStyle = utils.containsOriginal(newStyles, originalStyle);
						if (!matchingNewStyle) {
							//console.log("Did not find original style " + originalStyle.name + " in new styles: original style will be deleted. Styleset size is now: " + originalStyles.length);
						} else {
							originalStyles.push(originalStyle);
							/*
							 console.log("DEBUG: do nothing: keep style " + originalStyle.name + " because it already exists in the original styleset. " +
							 " When updating a styleset, it is not possible to also update a style. " +
							 " This means that copying of the actual style values should have taken place in a Style.update() call prior to this update of the styleset and its original.");
							 */
						}
					}
					originalStyleset.styles = originalStyles;
				} else {
					//console.log("No original styles => nothing removed from original styles");
				}

				// Add any styles to original?
				// Loop over styles in the new styleset and check if any style has an original that is not in the original styleset's styles.
				// NB! A copy, not the style itself, is added.
				var styleIdsToBeAdded = [];
				if (newStyles != null && newStyles.length > 0) {
					for (var i=0; i<newStyles.length; i++) {
						var newStyle = newStyles[i];
						var containsNewStyle = utils.containsCopy(originalStyles, newStyle);
						if (containsNewStyle) {
							//console.log("Found new style " + newStyle.name + " in original styles: not adding to original styles");
						} else {
							//console.log("Did not find new style " + newStyle.name + " in original styles: adding new style to original styles");
							styleIdsToBeAdded.push(newStyle);
						}
					}

					var numberOfStylesToBeAdded = styleIdsToBeAdded.length;
					if (numberOfStylesToBeAdded != null && numberOfStylesToBeAdded > 0) {
						styleIdsToBeAdded.forEach(function (styleIdToBeAdded) {
							Style.findOne({"_id": styleIdToBeAdded}, function (err, newStyle) {
								copyStyle(newStyle, originalStyleset._id, function(err, copy) {
									if (err) {
										return next(err);
									}

									async.parallel([
										// Save copy
										function(callback){
											copy.original = null; // It must look like the style copied back to the original styles was originally created there, i.e. has no original
											copy.save(function (err) {
												if (err) {
													return next(err);
												}

												callback(null);
											});
										},
										// Save styleToBeAdded
										function(callback){
											newStyle.original = copy._id; // It must look like the original of the style we just copied is the style we just copied
											newStyle.save(function (err) {
												if (err) {
													return next(err);
												}

												callback(null);
											});
										}
									], function () {
										originalStyleset.styles.push(copy);

										numberOfStylesToBeAdded--;
										if (numberOfStylesToBeAdded == 0) {
											return next(null);
										}
									});
								});
							});
						});
					} else {
						// All new styles already exists on the original styleset => nothing to be added to original styles
						return next(null);
					}
				} else {
					// No new styles => nothing added to original styles
					return next(null);
				}
			} else {
				return next("Original styleset can only be updated with stylesets originating from it => nothing has been updated!");
			}
		} else {
			return next("ERROR: invalid argument: original styleset cannot be a system styleset (it is not allowed to change system stylesets)!");
		}
	} else {
		return next("ERROR: invalid arguments: original styleset and new styleset must be non-empty and populated");
	}
};

exports.hasHiddenStyle = function (styles, styleName) {
	var result = false;
	if (styles) {
		for (var i=0; i<styles.length; i++) {
			var style = styles[i];
			if (style && style.hidden && style.name == styleName) {
				result = true;
				break;
			}
		}
	}
	return result;
}

exports.createStyleset = function (name, isSystem, order, accessLevels) {
	return new Styleset({
		name: name,
		isSystem: isSystem,
		order: order,
		accessLevels: accessLevels
	});
}

exports.createStyle = function (name, clazz, css, tag, stylesetId, isSystem, hidden, accessLevels) {
	return new Style({
		name: name,
		class: clazz,
		css: css,
		tag: tag,
		stylesetId: stylesetId,
		isSystem: isSystem,
		hidden: hidden,
		accessLevels: accessLevels
	});
}

function getCssKey ( cssNames, name ) {
	for (var key in cssNames) {
		if (cssNames.hasOwnProperty(key)) {
			if(cssNames[key].name == name) {
				return key;
			}
		}
	}
}

exports.systemStylesetOrder = function (s1, s2) {
	return s1.order - s2.order;
}

/**
 * Sort the styles by "system style order", i.e. so they appear in the same order as in "CSS names".
 *
 * @param s1
 * @param s2
 * @returns {number}
 */
var systemStyleOrder = function (s1, s2) {
	var s1KeyName = getCssKey(cssNames, s1.name);
	var s2KeyName = getCssKey(cssNames, s2.name);

	var s1Order = cssNames[s1KeyName] ? cssNames[s1KeyName].order : 9999;
	var s2Order = cssNames[s2KeyName] ? cssNames[s2KeyName].order : 9999;
	return s1Order - s2Order;
}

exports.systemStyleOrder = systemStyleOrder;

/**
 * Get the type of a styleset or style: system, user or document?
 *
 * @param stylesetOrStyle
 */
exports.getStylesetOrStyleType = function (stylesetOrStyle, next) {
	if (!stylesetOrStyle) return next("ERROR: undefined styleset/style");
	if (stylesetOrStyle.isSystem) {
		if (!stylesetOrStyle.original) {
			return next(null, "system");
		} else {
			return next("ERROR: styleset/style has isSystem = true but ALSO an 'original' - this is not allowed! (how did this happen?)");
		}
	} else {
		if (stylesetOrStyle.original) {
			Styleset.findOne({"_id": stylesetOrStyle.original}, function (err, stylesetOrStyleOriginal) {
				if (err) return next(err);
				if (!stylesetOrStyleOriginal) return next("ERROR: styleset/style has an original but this original could not be found in the database.");

				var type = stylesetOrStyleOriginal.isSystem ? "user" : "document";
				return next(null, type);
			});
		} else {
			// New user styleset
			return next(null, "user");
		}
	}
}

function createSystemStyleset(stylesheetName, order, next) {
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

		return next(null, styleset);
	});
}

function updateStyles(styleset, jsonStyleset, next) {
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

				// Notice that the style must exist in the same styleset to be considered a duplicate
				Style.findOne({"name": name, "class": clazz, "tag": tag, "stylesetId": styleset._id, "isSystem": true, "hidden": hidden}, function (err, style) {
					if (err) {
						callback(err);
					}

					if (style) {
						//logger.info(name + ' already exists, updating its CSS...');
						style.css = declarations;
					} else {
						var style = new Style({
							name: name,
							class: clazz,
							css: declarations,
							tag: tag,
							stylesetId: styleset._id,
							isSystem: true,
							hidden: hidden
						});
					}

					style.save(function (err, style) {
						if (err) {
							callback(err);
						}

						//logger.info(styleset.name + ': created/updated style: ' + JSON.stringify(style));
						styleset.styles.addToSet(style);
						callback(null);
					});
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

				populatedStyleset.styles.sort(systemStyleOrder);

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
}

exports.import_system_stylesets = function (alreadyConnected, exitWhenDone, next) {
	if (!alreadyConnected) mongoose.connect(conf.db.uri);

	var systemStylesetsDir = path.join(__dirname, '../public/create/stylesets');
	var stylesetFiles = [];

	filewalker(systemStylesetsDir, { recursive: false, matchRegExp: /[^non\-editable]\.(css)$/ })
		.on('file', function (stylesetFile) {
			stylesetFiles.push(stylesetFile);
		})
		.on('error', function (err) {
			logger.error(err);
			if (exitWhenDone) process.exit(1);
			if (next) return next(err);
		})
		.on('done', function () {
			var order = 0;

			async.eachSeries(stylesetFiles, function (stylesetFile, callback) {
				var stylesheetName = utils.getFilenameWithoutExtension(stylesetFile);
				var cssFilename = path.join(__dirname, '../public/create/stylesets/' + stylesetFile);
				var css = fs.readFileSync(cssFilename, 'utf8');
				var json = parser.parse(css);
				logger.info('Importing ' + cssFilename);

				Styleset.findOne({"name": stylesheetName, "isSystem": true}, function (err, styleset) {
					if (err) {
						callback(err);
					}

					if (!styleset) {
						logger.info(stylesheetName + ' does not exist, creating it...');
						createSystemStyleset(stylesheetName, order++, function (err, styleset) {
							if (err) {
								logger.error(err);
								if (exitWhenDone) process.exit(1);
							}

							updateStyles(styleset, json, function (err, styleset) {
								if (err) {
									logger.error(err);
									if (exitWhenDone) process.exit(1);
								}

								logger.info('Created styleset and styles for ' + cssFilename);
								callback(null);
							});
						});
					} else {
						logger.info(stylesheetName + ' already exists, updating its styles...');
						updateStyles(styleset, json, function (err, styleset) {
							if (err) {
								logger.error(err);
								if (exitWhenDone) process.exit(1);
							}

							logger.info('Updated styles for ' + cssFilename);
							callback(null);
						});
					}
				});
			}, function (err) {
				if (err) {
					logger.error(err);
					if (exitWhenDone) process.exit(1);
					if (next) return next(err);
				}

				if (exitWhenDone) process.exit(0);
				if (next) return next(err);
			});
		})
		.walk();

	process.on('exit', function() {
		if (exitWhenDone) logger.info('Imported all system stylesets from ' + systemStylesetsDir + ' (but check log messages for errors)');
	});
}