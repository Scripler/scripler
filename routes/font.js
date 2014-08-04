var utils = require('../lib/utils');
var font_utils = require('../lib/font-utils');
var Font = require('../models/font.js').Font;

//Load styleset by id
exports.load = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.fontId;
		Font.findOne({"_id": idCopy, "deleted": false}, function (err, font) {
			if (err) return next(err);
			if (!font) {
				return next({message: "Font not found", status: 404});
			}
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!font.isSystem && !utils.hasAccessToModel(req.user, font)) return next(403);
			req.font = font;
			return next();
		});
	}
}

exports.create = function (req, res, next) {
	var font = new Font({
		family: req.body.family,
		style: req.body.style,
		weight: req.body.weight,
		src: req.body.src,
		isSystem: req.body.isSystem,
		accessLevels: ["premium", "professional"]
	});

	if (req.user.level == "free") {
		return next({message: "Free users are not allowed to create fonts", status: 403});
	}

	if (!req.body.isSystem) {
		font.members = [
			{userId: req.user._id, access: ["admin"]}
		];
	}

	font.save(function(err) {
		if (err) {
			return next(err);
		}

		if (!req.body.isSystem) {
			// TODO: add to user.fonts when "user fonts" becomes a feature
			/*
			req.user.fonts.addToSet(font);
			req.user.save(function(err) {
				if (err) {
					return next(err);
				}

				res.send({font: font});
			});
			*/

			res.send({font: font});
		} else {
			res.send({font: font});
		}
	});

}

exports.open = function (req, res) {
	res.send({font: req.font});
}
