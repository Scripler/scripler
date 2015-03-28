var Styleset = require('../models/styleset.js').Styleset;
var copyStyleset = require('../models/styleset.js').copy;
var styleset_utils = require('./styleset-utils');
var utils_shared = require('../public/create/scripts/utils-shared');

function checkCopyStyleset (stylesetToApply, documentStylesetIds, defaultStylesetId) {
	/*
	 Only copy the styleset if it is not already applied to the document, i.e. if:
	 - The styleset to apply is not the same as the default styleset
	 AND
	 (
	 - The document does not have any stylesets
	 OR
	 - The styleset to apply is not in the document's stylesets
	 )
	 TODO: could use an IT or two.
	 */
	return stylesetToApply._id != defaultStylesetId && (!documentStylesetIds || documentStylesetIds.length == 0 || documentStylesetIds.indexOf(stylesetToApply._id) < 0);
};

exports.applyStylesetToDocument = function (document, stylesetToApply, setAsDefault, level, next) {

	// The stylsetToApply might already be in the document stylesets array - if so, use the document styleset instead!
	Styleset.findOne({"original": stylesetToApply._id, "_id": {$in: document.stylesets}}).exec(function (err, styleset) {
		if (err) {
			return next(err);
		}
		if (styleset) {
			// If we found a styleset, it's the matching document styleset, use that instead of the user styleset
			stylesetToApply = styleset;
		}

		var shouldCopyStyleset = checkCopyStyleset(stylesetToApply, document.stylesets, document.defaultStyleset);
		if (shouldCopyStyleset) {
			if (stylesetToApply.accessLevels.indexOf(level) == -1 && !stylesetToApply.accessPayment) {
				return next({message: "Free users are not allowed to apply premium styles", status: 402});
			}
			copyStyleset(stylesetToApply, function(err, copy) {
				document.stylesets.addToSet(copy);
				if (setAsDefault) {
					document.defaultStyleset = copy;
				}
				document.save(function (err) {
					if (err) {
						return next(err);
					}
					Styleset.findOne({"_id": copy._id}).populate('styles').exec(function (err, populatedCopy) {
						if (err) {
							return next(err);
						}
						populatedCopy.styles.sort(styleset_utils.systemStyleOrder);
						return next(null, populatedCopy);
					});
				});
			});
		} else {
			if (!setAsDefault || utils_shared.mongooseEquals(document.defaultStyleset, stylesetToApply)) {
				// Document styleset already exists, and default styleset should not be changed, so ignore.
				return next(null, stylesetToApply);
			} else {
				// The existing document styleset is not the default styleset, so we need to update this
				document.defaultStyleset = copy;
				document.save(function (err) {
					if (err) {
						return next(err);
					}
					return next(null, stylesetToApply);
				});
			}
		}

	});

}