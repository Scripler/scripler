var Styleset = require('../models/styleset.js').Styleset;
var copyStyleset = require('../models/styleset.js').copy;
var styleset_utils = require('./styleset-utils');

function checkCopyStyleset (stylesetToApply, documentStylesetIds, defaultStylesetId) {
	return stylesetToApply._id != defaultStylesetId && (!documentStylesetIds || documentStylesetIds.length == 0 || documentStylesetIds.indexOf(stylesetToApply._id) < 0);
};

exports.applyStylesetToDocument = function (document, stylesetToApply, level, next) {
	if (level == "free") {
		return next({message: "Free users are not allowed to apply styles", status: 402});
	}

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
	var shouldCopyStyleset = checkCopyStyleset(stylesetToApply, document.stylesets, document.defaultStyleset);
	if (shouldCopyStyleset) {

		console.log('styleset' + stylesetToApply.name + ' copy id'+stylesetToApply._id);

		copyStyleset(stylesetToApply, function(err, copy) {
			document.stylesets.addToSet(copy);
			
			document.defaultStyleset = copy;

			console.log('be doc id:'+ document._id);

			document.save(function (err) {
				if (err) {
					return next(err);
				}
			
				Styleset.findOne({"_id": copy._id}).populate('styles').exec(function (err, populatedCopy) {
					if (err) {
						return next(err);
					}

					populatedCopy.styles.sort(styleset_utils.systemStyleOrder);
					console.log('styleset' + populatedCopy.name + ' copy id'+populatedCopy._id);
					return next(null, populatedCopy);
				});
			});
		});
	} else {
		return next();
	}
}