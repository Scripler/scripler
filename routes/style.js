var utils = require('../lib/utils');
var Style = require('../models/style.js').Style;

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

	if (!req.body.isSystem) {
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
 * Update a style, i.e. its name, class and/or CSS.
 *
 * This function does NOT create a copy of a style, since copying of styles is currently done on styleset level.
 *
 * For example, when updating a style in a styleset on a document (and not on a user), Styleset.update() should first be called:
 * this will copy the styles of the styleset, including the style to be updated, and this function can then be called on
 * the copied style.
 *
 * @param req
 * @param res
 * @param next
 */
exports.update = function (req, res, next) {
	var style = req.style;
	style.name = req.body.name;
	style.class = req.body.class;
	style.css = req.body.css;
	style.save(function (err) {
		if (err) {
			return next(err);
		}

		res.send({style: style});
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
