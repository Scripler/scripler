var utils = require('../lib/utils');
var Style = require('../models/style.js').Style;
var Styleset = require('../models/styleset.js').Styleset;
var styleset_utils = require('../lib/styleset-utils.js');
var styleset_route = require('./styleset');

//Load style by id
exports.load = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.styleId;
		Style.findOne({"_id": idCopy, "deleted": false}, function (err, style) {
			if (err) return next(err);
			if (!style) {
				return next({message: "Style not found", status: 404});
			}
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!style.isSystem && !utils.hasAccessToModel(req.user, style)) return next(403);
			req.style = style;
			return next();
		});
	}
}

exports.loadPopulated = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.styleId;
		Style.findOne({"_id": idCopy, "deleted": false}).exec(function (err, style) {
			if (err) return next(err);
			if (!style) {
				return next({message: "Style not found", status: 404});
			}
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!style.isSystem && !utils.hasAccessToModel(req.user, style)) return next(403);
			req.style = style;
			return next();
		});
	}
}


exports.create = function (req, res, next) {
	var styleset = req.styleset;

	var style = new Style({
		name: req.body.name,
		class: req.body.class,
		css: req.body.css,
		tag: req.body.tag,
		stylesetId: styleset._id,
		isSystem: req.body.isSystem,
		hidden: req.body.hidden
	});

	if (!req.body.isSystem) {
		style.members = [
			{userId: req.user._id, access: ["admin"]}
		];
	}

    //TODO: Maybe we should immeditaly add this style to its styleset? Instead of expecting/hoping the frontend does a Styleset.update afterwards.
	style.save(function(err) {
		if (err) {
			return next(err);
		}

		styleset.styles.addToSet(style);
		styleset.save(function (err) {
			if (err) {
				return next(err);
			}

			if (styleset.original) {
				//console.log("Style was created in a copied styleset: updating original styleset...");
				styleset_route.populateAndUpdateOriginalStyleset(styleset, function (err) {
					if (err) {
						return next(err);
					}

					//console.log("Original styleset was updated...");
					res.send({style: style});
				});
			} else {
				//console.log("Style was created in a non-copied styleset: no original to update, just return the style");
				res.send({style: style});
			}
		});
	});

}

exports.open = function (req, res) {
	res.send({style: req.style});
}

/**
 *
 * Update a style, i.e. its name, class, css and tag.
 *
 * If the style is copied, i.e. has an original, also update the original.
 *
 * See also Styleset.update().
 *
 * @param req
 * @param res
 * @param next
 */
exports.update = function (req, res, next) {
	var style = req.style;

	var updateOriginalStyle = function(newStyle, next) {
		// Populate the original style (was not loaded)
		Style.findOne({"_id": newStyle.original}).exec(function (err, populatedOriginalStyle) {
			if (err) {
				return next(err);
			}

			styleset_utils.updateOriginalStyle(populatedOriginalStyle, newStyle, function (err) {
				populatedOriginalStyle.save(function (err, updatedOriginalStyle) {
					if (err) {
						return next(err);
					}

					return next(null, updatedOriginalStyle);
				});
			});
		});
	};

	style.name = req.body.name;
	style.class = req.body.class;
	style.css = req.body.css;
	style.tag = req.body.tag;

	style.save(function (err, updatedStyle) {
		if (err) {
			return next(err);
		}

		// Update the original style if one such exists
		if (updatedStyle.original) {
			updateOriginalStyle(updatedStyle, function (err, updatedOriginalStyle) {
				if (err) {
					return next(err);
				}

				// NB! The updated style from the request, not the updated original, is returned!
				res.send({style: updatedStyle});
			});
		} else {
			res.send({style: updatedStyle});
		}
	});
}

exports.archive = function (req, res, next) {
	var style = req.style;
	style.archived = true;
	style.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({style: style});
	});
}

exports.unarchive = function (req, res, next) {
	var style = req.style;
	style.archived = false;
	style.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({style: style});
	});
}

exports.archived = function (req, res, next) {
	Style.find({"archived": true, "members": {"$elemMatch": {"userId": req.user._id, "access": "admin"}}}, function (err, styles) {
		if (err) {
			return next(err);
		}
		res.send({"styles": styles});
	});
};
