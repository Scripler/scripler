var utils = require('../lib/utils');
var Styleset = require('../models/styleset.js').Styleset;
var Style = require('../models/style.js').Style;
var Project = require('../models/project.js').Project;
var styleset_utils = require('../public/create/scripts/styleset-utils.js');

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

exports.loadPopulated = function (id) {
	return function (req, res, next) {
		var idCopy = id || req.body.stylesetId;
		/*
		 Don't use "match" to in populate() below if you plan on later saving the object - this will throw the following error:

		 	"For your own good, using `document.save()` to update an array which was selected using an $elemMatch projection OR populated using skip, limit, query conditions, or exclusion of the _id field when the operation results in a $pop or $set of the entire array is not supported. The following path(s) would have been modified unsafely..."

		 This makes sense: how should Mongoose know what to do when we have filtered out some of the styles and then try to save only some of them?
		 */
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

	var updateOriginalStyleset = function(styleset, next) {
		// The new/updated styleset is populated by loadPopulated(), so just populate the original
		Styleset.findOne({"_id": styleset.original}).populate({path: 'styles'}).exec(function (err, populatedOriginalStyleset) {
			if (err) {
				return next(err);
			}

			// TODO: why is it necessary to populate the new/updated styleset here, c.f. comment above?
			Styleset.findOne({"_id": styleset._id}).populate({path: 'styles'}).exec(function (err, populatedNewStyleset) {
				if (err) {
					return next(err);
				}

				styleset_utils.updateOriginalStyleset(populatedOriginalStyleset, populatedNewStyleset, function (err) {
					populatedOriginalStyleset.save(function (err, updatedOriginalStyleset) {
						if (err) {
							return next(err);
						}

						return next(null, updatedOriginalStyleset);
					});
				});
			});
		});
	};

	styleset.name = req.body.name;
	// TODO: implement some sort of safety check ensuring that we only accept styles from the current styleset? See also TODO in models/Styleset.styles
	styleset.styles = req.body.styles;
	styleset.save(function (err, updatedStyleset) {
		if (err) {
			return next(err);
		}

		// Update the original styleset if one such exists
		if (updatedStyleset.original) {
			updateOriginalStyleset(updatedStyleset, function (err, updatedOriginalStyleset) {
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

exports.list = function (req, res, next) {
	Styleset.find({"isSystem": true}, function (err, stylesets) {
		if (err) {
			return next(err);
		}

		res.send({"stylesets": stylesets});
	});
};
