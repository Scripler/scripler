var utils = require('../lib/utils');
var Styleset = require('../models/styleset.js').Styleset;
var Project = require('../models/project.js').Project;
var copyStyleset = require('../models/styleset.js').copy;

//Load styleset by id
exports.load = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.stylesetId;
		Styleset.findOne({"_id": idCopy, "deleted": false}, function (err, styleset) {
			if (err) return next(err);
			if (!styleset) {
				return next({message: "Styleset not found", status: 404});
			}
			if (!req.user) return next();//Let missing authentication be handled in auth middleware
			if (!styleset.isSystem && !utils.hasAccessToModel(req.user, styleset)) return next(403);
			req.styleset = styleset;
			return next();
		});
	}
}

exports.create = function (req, res, next) {
	var styleset = new Styleset({
		name: req.body.name,
		isSystem: req.body.isSystem
	});

	// TODO: refactor into "isFalsy" utility method - one such already exists?
	if (!req.body.isSystem || req.body.isSystem == "false") {
		styleset.members = [
			{userId: req.user._id, access: ["admin"]}
		];
	}

	styleset.save(function(err) {
		if (err) {
			return next(err);
		}

		if (!req.body.isSystem) {
			req.user.stylesets.addToSet(styleset);
			req.user.save(function(err) {
				if (err) {
					return next(err);
				}

				res.send({styleset: styleset});
			});
		} else {
			res.send({styleset: styleset});
		}
	});

}

exports.open = function (req, res) {
	res.send({styleset: req.styleset});
}

/**
 *
 * Update a styleset, i.e. its name and/or styles.
 *
 * Check if copy of the styleset has been made, and if not, copy the styleset, including its styles.
 *
 * See also Style.update().
 *
 * @param req
 * @param res
 * @param next
 */
exports.update = function (req, res, next) {
	var styleset = req.styleset;

	var updateStyleset = function(styleset, next) {
		styleset.name = req.body.name;
		styleset.styles = req.body.styles;
		styleset.save(function (err) {
			if (err) {
				return next(err);
			}

			return next(null, styleset);
		});
	};

	// Only copy the first time an update is made
	if (styleset.original) {
		updateStyleset(styleset, function (err, updatedStyleset) {
			if (err) {
				return next(err);
			}

			res.send({styleset: updatedStyleset});
		});
	} else {
		copyStyleset(styleset, function(err, copy) {
			if (err) {
				return next(err);
			}

			updateStyleset(copy, function (err, updatedStyleset) {
				if (err) {
					return next(err);
				}

				res.send({styleset: updatedStyleset});
			});
		});
	}
}

exports.rearrange = function (req, res, next) {
	var user = req.user;
	user.stylesets = req.body.stylesets;
	user.save(function (err, user) {
		if (err) {
			return next(err);
		}
		res.send({user: user});
	});
}

exports.archive = function (req, res, next) {
	var styleset = req.styleset;
	styleset.archived = true;
	styleset.save(function (err) {
		if (err) {
			return next(err);
		}
		// TODO: Fix: find/load the project and null "styleset"?
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
		// TODO: Fix: find/load the project and reset "styleset"?
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

exports.list = function (req, res, next) {
	Styleset.find({"isSystem": true}, function (err, stylesets) {
		if (err) {
			return next(err);
		}

		res.send({"stylesets": stylesets});
	});
};
