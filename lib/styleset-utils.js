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

exports.getNonEditableCss = function (fontsInUse, next) {
	var nonEditableCssFilename = path.resolve(__dirname, '../public/create/stylesets', 'non-editable.css');
	var nonEditableCssOriginal = fs.readFileSync(nonEditableCssFilename);

	font_utils.removeUnusedFonts(nonEditableCssOriginal.toString(), fontsInUse, true, function (err, nonEditableCssModified) {
		if (err) {
			return next(err);
		}

		//console.log('nonEditableCssModified: ' + nonEditableCssModified);
		return next(null, nonEditableCssModified);
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
		// TODO: remove this check when implementing "reset" because a document styleset's original is the user styleset but the document styleset is being reset to the system styleset
		if (newStyleset.original == originalStyleset.id) {
			originalStyleset.name = newStyleset.name;

			var originalStyles = originalStyleset.styles;
			var newStyles = newStyleset.styles;

			/*
				 Update any existing styles or remove any missing styles from original?

				 Loop over styles in the original styleset and check if any style is NOT set as original on the new styles.

				 It is safe to delete the style from the original styleset because a style can always only belong to one styleset, so we know the style is not being used by another styleset.
				 */
			if (originalStyles != null && originalStyles.length > 0) {
				for (var i=0; i<originalStyles.length; i++) {
					var originalStyle = originalStyles[i];
					var matchingNewStyle = utils.containsOriginal(newStyles, originalStyle);
					if (!matchingNewStyle) {
						//console.log("Did not find original style " + originalStyle.name + " in new styles: deleting original style");
						originalStyleset.styles.splice(i, 1);
					} else {
						/*
							console.log("DEBUG: do nothing: style " + matchingNewStyle.name + " already exists in the original styleset. " +
								" When updating a styleset, it is not possible to also update a style. " +
								" This means that copying of the actual style values should have taken place in a Style.update() call prior to this update of the styleset and its original.");
							*/
						}
					}
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
					return next(null);
				}
			} else {
				//console.log("No new styles => nothing added to original styles");
				return next(null);
			}
		} else {
			return next("Original styleset can only be updated with stylesets originating from it => nothing has been updated!");
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

/**
 * Sort the styles by "system style order", i.e. so they appear in the same order as in "CSS names".
 *
 * @param s1
 * @param s2
 * @returns {number}
 */
exports.systemStyleOrder = function (s1, s2) {
	var s1KeyName = getCssKey(cssNames, s1.name);
	var s2KeyName = getCssKey(cssNames, s2.name);

	var s1Order = cssNames[s1KeyName] ? cssNames[s1KeyName].order : 9999;
	var s2Order = cssNames[s2KeyName] ? cssNames[s2KeyName].order : 9999;
	return s1Order - s2Order;
}
