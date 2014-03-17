var utils = require('../lib/utils');
var Style = require('../models/style.js').Style;

//Load style by id
exports.load = function (id) {
	return function (req, res, next) {
		// TODO: specifying "id" as a var will cause its value to be undefined - WHY? (why is the "id" param not in scope anymore?)
		id = id || req.body.styleId;
		Style.findOne({"_id": id}, function (err, style) {
			if (err) return next(err);
			if (!style) {
				return next({message: "Style not found", status: 404});
			}
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!utils.hasAccessToEntity(req.user, style)) return next(403);
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
		stylesetId: styleset._id,
		members: [
			{userId: req.user._id, access: ["admin"]}
		]
	});

	style.save(function(err) {
		if (err) {
			return next(err);
		}

		styleset.styles.addToSet(style);
		styleset.save(function (err, styleset) {
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

exports.update = function (req, res, next) {
	var style = req.style;
	style.name = style.name;
	style.class = style.class;
	style.css = style.css;
	style.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({});
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
