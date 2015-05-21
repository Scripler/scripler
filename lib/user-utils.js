var User = require('../models/user.js').User;
var env = process.env.NODE_ENV;
var conf = require('config');
var utils = require('../lib/utils');
var Styleset = require('../models/styleset.js').Styleset;
var styleset_utils = require('../lib/styleset-utils');
var copyStyleset = require('../models/styleset.js').copy;
var emailer = require('../lib/email/email.js');
var path = require('path');
var mkdirp = require('mkdirp');
var crypto = require('crypto');

exports.changeLevel = function (userId, level, next) {
	User.findOne({_id: userId}, function(err, user) {
		if (err) {
			return next(err);
		}
		user.level = level;
		user.save(function (err, user) {
			if (err) {
				return next(err);
			}
			return next();
		});
	});
}

var hashEmail = function (email) {
	return crypto.createHash('md5').update(conf.app.salt + email).digest("hex");
}

exports.hashEmail = hashEmail;

exports.initUser = function(user, next) {
	if ('test' != env) {
		// Currently we just force user to become premium member immediately (for free)
		// TODO: When launching (currently Beta1) this should be removed!
		user.level = "premium";
	}

	// Copy all system/Scripler stylesets (and styles) to the user
	Styleset.find({isSystem: true}, function (err, stylesets) {
		if (err) {
			return next(err);
		}

		user.save(function (err) {
			if (err) {
				// return error
				// TODO: add 11001 as in User.edit()?
				if (err.code == 11000) {
					return next({errors: "Email already registered", status: 400});
				}
				return next(err);
			} else {
				if (!user.isDemo) {
					emailer.sendUserEmail(
						user,
						[
							{name: "URL", content: conf.app.url_prefix + 'user/' + user._id + '/verify/' + hashEmail(user.email)}
						],
						'welcome'
					);
				}
			}

			var createDirectories = function (next) {
				var userDir = path.join(conf.resources.usersDir, conf.epub.userDirPrefix + user._id);
				mkdirp(userDir, function (err) {
					if (err) {
						return next(err);
					} else {
						return next();;
					}
				});
			};

			var numberOfStylesetsToBeCopied = stylesets.length;
			if (numberOfStylesetsToBeCopied == 0) {
				return createDirectories(next);
			} else {
				var stylesetCopies = [];
				stylesets.forEach(function (styleset) {
					styleset.isSystem = false;
					styleset.members = [{userId: user._id, access: ["admin"]}];
					copyStyleset(styleset, function(err, copy) {
						if (err) {
							return next(err);
						}

						stylesetCopies.push(copy);

						if (copy.name === conf.user.defaultStylesetName) {
							user.defaultStyleset = copy;
						}

						numberOfStylesetsToBeCopied--;

						if (numberOfStylesetsToBeCopied == 0) {
							// Sort stylesets by name (currently only used for integration test, i.e. not important for the app)
							// After stylesets are added to user.stylesets, user.stylesets only contains ids, so to avoid re-reading the stylesets from the db, save them in a temporary array.
							stylesetCopies.sort(styleset_utils.systemStylesetOrder);
							user.stylesets = stylesetCopies;

							user.save(function (err) {
								if (err) {
									return next(err);
								}

								if (utils.isEmpty(user.defaultStyleset)) {
									// TODO: should this error be shown to the user?
									logger.error("No default styleset set for user " + user.firstname + " " + user.lastname + "(id = " + user._id + ").");
								}

								return createDirectories(next);
							});
						}
					});
				});
			}
		});
	});
}