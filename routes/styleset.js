var utils = require('../lib/utils');
var Styleset = require('../models/styleset.js').Styleset;
var Style = require('../models/style.js').Style;
var Project = require('../models/project.js').Project;
var styleset_utils = require('../lib/styleset-utils.js');
var async = require('async');

//Load styleset by id
exports.load = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.stylesetId;
		Styleset.findOne({"_id": idCopy, "deleted": false}).exec(function (err, styleset) {
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

exports.loadPopulated = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.stylesetId;
		Styleset.findOne({"_id": idCopy, "deleted": false}).populate({path: 'styles'}).exec(function (err, styleset) {
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
	if (req.user.level == "free") {
		return next({message: "Free users are not allowed to create stylesets", status: 402});
	}

	var styleset = styleset_utils.createStyleset(req.body.name, false, req.body.order, ["premium", "professional"]);
		styleset.members = [
			{userId: req.user._id, access: ["admin"]}
		];

	styleset.save(function(err) {
		if (err) {
			return next(err);
		}

			req.user.stylesets.addToSet(styleset);
			req.user.save(function(err) {
				if (err) {
					return next(err);
				}

				res.send({styleset: styleset});
			});
	});

}

exports.open = function (req, res) {
	res.send({styleset: req.styleset});
}

/**
 * TODO: remove this function and require callers to populate the stylesets and call styleset_utils.updateOriginalStyleset() themselves?
 *
 * @type {Function}
 */
var populateAndUpdateOriginalStyleset = exports.populateAndUpdateOriginalStyleset = function(newStyleset, next) {
	// Populate the original styleset (was not loaded)
	Styleset.find({"_id": {$in: [newStyleset._id, newStyleset.original]}}).populate({path: 'styles'}).exec(function (err, populatedStylesets) {
		if (err) {
			return next(err);
		}

		if (populatedStylesets.length==2) {
			var populatedOriginalStyleset;
			var populatedNewStyleset;

			if (populatedStylesets[0]._id == newStyleset.original) {
				populatedNewStyleset = populatedStylesets[0];
				populatedOriginalStyleset  = populatedStylesets[1];
			} else {
				populatedOriginalStyleset = populatedStylesets[0];
				populatedNewStyleset = populatedStylesets[1];
			}

			if (populatedOriginalStyleset.isSystem) {
				return next({status: 507, message: "ERROR: it is not allowed to update a system styleset!"});
			} else {
				if (populatedOriginalStyleset.original) {
					styleset_utils.updateOriginalStyleset(populatedOriginalStyleset, populatedNewStyleset, function (err) {
						populatedOriginalStyleset.save(function (err, updatedOriginalStyleset) {
							if (err) {
								return next(err);
							}

							return next(null, updatedOriginalStyleset);
						});
					});
				} else {
					return next();
				}
			}
		} else {
			return next("ERROR: could not find both new and original styleset!");
		}
	});
}

/**
 *
 * Update a styleset, i.e. its name and styles.
 *
 * If the styleset is copied, i.e. has an original, also update the original.
 *
 * See also Style.update().
 *
 * @param req
 * @param res
 * @param next
 */
exports.update = function (req, res, next) {
	var styleset = req.styleset;

	styleset.name = req.body.name;
	styleset.order = req.body.order;

	if (req.user.level == "free") {
		return next({message: "Free users are not allowed to update stylesets", status: 402});
	}

	// TODO: implement some sort of safety check ensuring that we only accept styles from the current styleset? See also TODO in models/Styleset.styles
	styleset.styles = req.body.styles;

	styleset.save(function (err, updatedStyleset) {
		if (err) {
			return next(err);
		}

		// Update the original styleset if one such exists
		if (updatedStyleset.original) {
			populateAndUpdateOriginalStyleset(updatedStyleset, function (err, updatedOriginalStyleset) {
				if (err) {
					return next(err);
				}

				// NB! The updated styleset from the request, not the updated original, is returned!
				res.send({styleset: updatedStyleset});
			});
		} else {
			res.send({styleset: updatedStyleset});
		}
	});

}

exports.rearrange = function (req, res, next) {
	var orderedStylesets = [];

	async.each(req.body.orderedStylesets, function (orderedStyleset, callback) {
		Styleset.findOne({"_id": orderedStyleset.id}, function (err, styleset) {
			if (err) {
				callback(err);
			}

			styleset.order = orderedStyleset.order;
			styleset.save(function (err) {
				if (err) {
					callback(err);
				}

				orderedStylesets.push({ id: styleset._id, order: styleset.order });
				callback();
			});
		});

	}, function (err) {
		if (err) {
			return next(err);
		}
		orderedStylesets.sort(styleset_utils.systemStylesetOrder);
		res.send({stylesets: orderedStylesets});
	});
}

exports.archive = function (req, res, next) {
	var styleset = req.styleset;
	styleset.archived = true;
	styleset.save(function (err) {
		if (err) {
			return next(err);
		}

		// TODO: remove (pull) styleset from all documents it is used in?

		res.send({styleset: styleset});
	});
}

exports.unarchive = function (req, res, next) {
	var styleset = req.styleset;
	styleset.archived = false;
	styleset.save(function (err) {
		if (err) {
			return next(err);
		}

		// TODO: put (push) styleset back on ....what? How can we know which documents it was used in?

		res.send({styleset: styleset});
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

exports.listSystemStylesets = function (req, res, next) {
	Styleset.find({"isSystem": true}, function (err, stylesets) {
		if (err) {
			return next(err);
		}

		res.send({"stylesets": stylesets});
	});
};
