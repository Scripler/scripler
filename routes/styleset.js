var utils = require('../lib/utils');
var Styleset = require('../models/styleset.js').Styleset;

//Load styleset by id
exports.load = function (id) {
	return function (req, res, next) {
		// TODO: specifying "id" as a var will cause its value to be undefined - WHY? (why is the "id" param not in scope anymore?)
		id = id || req.body.stylesetId;
		Styleset.findOne({"_id": id}, function (err, styleset) {
			if (err) return next(err);
			if (!styleset) {
				return next({message: "Styleset not found", status: 404});
			}
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!utils.hasAccessToEntity(req.user, styleset)) return next(403);
			req.styleset = styleset;
			return next();
		});
	}
}
exports.create = function (req, res, next) {
	var styleset = new Styleset({
		name: req.body.name,
		members: [
			{userId: req.user._id, access: ["admin"]}
		]
	});

	styleset.save(function(err) {
		if (err) {
			return next(err);
		}

		res.send({styleset: styleset});
	});

}

exports.open = function (req, res) {
	res.send({styleset: req.styleset});
}
