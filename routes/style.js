var utils = require('../lib/utils');
var Style = require('../models/style.js').Style;
var Styleset = require('../models/styleset.js').Styleset;
var copyStyleset = require('../models/styleset.js').copy;
var copyStyle = require('../models/style.js').copy;

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

exports.create = function (req, res, next) {
	var styleset = req.styleset;

	var style = new Style({
		name: req.body.name,
		class: req.body.class,
		css: req.body.css,
		tag: req.body.tag,
		stylesetId: styleset._id,
		isSystem: req.body.isSystem
	});

	// TODO: refactor into "isFalsy" utility method - one such already exists?
	if (!req.body.isSystem || req.body.isSystem == "false") {
		style.members = [
			{userId: req.user._id, access: ["admin"]}
		];
	}

	style.save(function(err) {
		if (err) {
			return next(err);
		}

		styleset.styles.addToSet(style);
		styleset.save(function (err) {
			if (err) {
				return next(err);
			}
			res.send({style: style});
		});
	});

}

exports.open = function (req, res) {
	res.send({style: req.style});
}

/**
 *
 * Update a style, i.e. its name, class or CSS.
 *
 * 1. Check if the style's styleset has been copied...
 * 2. If so, check if the style has been copied...
 *   2.1. If so, update it, save the changes on the original style and return the updated style.
 *   2.2. If not, copy it, update it, save the changes on the original style and return the updated copy.
 * 3. If not, copy it, and check if the style has been copied...
 *   3.1. If so, update it, save the changes on the original style and return the updated style.
 *   3.2. If not, copy it, update it, save the changes on the original style and return the updated copy.
 *
 * @param req
 * @param res
 * @param next
 */
exports.update = function (req, res, next) {
	var style = req.style;

	var updateStyle = function (style, next) {
		style.name = req.body.name;
		style.class = req.body.class;
		style.css = req.body.css;
		style.save(function (err) {
			if (err) {
				return next(err);
			}

			// Update the original style if one such exists
			if (style.original) {
				Style.findOne({"_id": style.original}, function (err, originalStyle) {
					if (err) {
						return next(err);
					}

					originalStyle.name = style.name;
					originalStyle.class = style.class;
					originalStyle.css = style.css;
					originalStyle.save(function (err) {
						if (err) {
							return next(err);
						}

						// NB! The updated style, not the original, is returned
						return next(null, style);
					});
				});
			} else {
				return next(null, style);
			}

			return next(null, style);
		});
	};

	var checkAndUpdateStyle = function (style, next) {
		if (style.original) {
			return updateStyle(style, next);
		} else {
			copyStyle(style, style.stylesetId, function(err, copy) {
				if (err) {
					return next(err);
				}

				return updateStyle(copy, next);
			});
		}
	};

	Styleset.findOne({"_id": style.stylesetId}, function (err, styleset) {
		if (err) {
			return next(err);
		}

		if (styleset.original) {
			checkAndUpdateStyle(style, function(err, updatedStyle) {
				if (err) {
					return next(err);
				}

				res.send({style: updatedStyle});
			});
		} else {
			// This also copies all styles in the styleset
			copyStyleset(styleset, function(err, copy) {
				if (err) {
					return next(err);
				}

				Style.findOne({"original": style._id}, function (err, updatedStyle) {
					if (err) {
						return next(err);
					}

					checkAndUpdateStyle(updatedStyle, function(err, style) {
						if (err) {
							return next(err);
						}

						res.send({style: style});
					});
				});
			});
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
