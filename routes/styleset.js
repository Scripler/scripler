var utils = require('../lib/utils');
var Styleset = require('../models/styleset.js').Styleset;
var Project = require('../models/project.js').Project;

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
			if (!utils.hasAccessToModel(req.user, styleset)) return next(403);
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

exports.update = function (req, res, next) {
	var styleset = req.styleset;
	styleset.name = styleset.name;
	styleset.styles = styleset.styles;
	styleset.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({});
	});
}

exports.rearrange = function (req, res, next) {
	var project = req.project;
	project.stylesets = req.body.stylesets;
	project.save(function (err, project) {
		if (err) {
			return next(err);
		}
		res.send({project: project});
	});
}

exports.archive = function (req, res, next) {
	var styleset = req.styleset;
	styleset.archived = true;
	styleset.save(function (err) {
		if (err) {
			return next(err);
		}
		Project.update({"stylesets": styleset._id}, {"$pull": {"stylesets": styleset._id}}, {multi: true}, function (err, numberAffected, raw) {
			if (err) {
				return next(err);
			}
			res.send({styleset: styleset});
		});
	});
}

exports.unarchive = function (req, res, next) {
	var styleset = req.styleset;
	styleset.archived = false;
	styleset.save(function (err) {
		if (err) {
			return next(err);
		}
		var membersArray = [];
		for (var i = 0; i < styleset.members.length; i++) {
			membersArray.push(styleset.members[i].userId);
		}
		Project.update({"members": {"$in": membersArray}}, {"$addToSet": {"stylesets": styleset._id}}, {multi: true}, function (err, numberAffected, raw) {
			if (err) {
				return next(err);
			}
			res.send({styleset: styleset});
		});
	});
}

exports.archived = function (req, res, next) {
	Styleset.find({"archived": true, "members": {"$elemMatch": {"userId": req.user._id, "access": "admin"}}}, function (err, stylesets) {
		if (err) {
			return next(err);
		}
		res.send({"stylesets": stylesets});
	});
};
