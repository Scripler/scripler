var User = require('../models/user.js').User
	, passport = require('passport')
	, emailer = require('../lib/email/email.js')
	, crypto = require('crypto')
	, conf = require('config')
	, logger = require('../lib/logger')
	, conf = require('config')
	, env = process.env.NODE_ENV
	, path = require('path')
	, fs = require('fs')
	, utils = require('../lib/utils')
	, utils_shared = require('../public/create/scripts/utils-shared')
	, mkdirp = require('mkdirp')
	, Styleset = require('../models/styleset.js').Styleset,
	copyStyleset = require('../models/styleset.js').copy,
	discourse_sso = require('discourse-sso')
;

function hashEmail(email) {
	return crypto.createHash('md5').update(conf.app.salt + email).digest("hex");
}

/**
 * GET current user.
 */
exports.get = function (req, res) {
	res.send({"status": 0, "user": req.user});
};

/**
 * GET users listing.
 */
exports.list = function (req, res, next) {
	User.find({}, function (err, docs) {
		if (err) {
			return next(err);
		}
		res.send({"users": docs});
	});
};

/**
 * POST user login.
 */
exports.login = function (req, res, next) {
	passport.authenticate('local', function (err, user, info) {
		if (err) {
			return next(err);
		}
		if (!user) {
			return next({message: info.message, status: 401});
		}
		if (!user.password) {
			return next({message: "User does not have password associated. Use OAuth: " + user.providers, status: 400});
		}
		req.logIn(user, function (err) {
			if (err) {
				return next(err);
			}
			// As default our session is saved as a cookie for 30 days.
			// If user chooses not to be remembered across sessions, disable this.
			if (!req.body.remember) {
				req.session.cookie.expires = false;
			}
			res.send({"user": user});
		});
	})(req, res, next);
};

/**
 * POST user logout.
 */
exports.logout = function (req, res) {
	req.logout();
	res.send({});
};

/**
 * PUT password reset (send email).
 */
exports.passwordReset = function (req, res, next) {
	crypto.randomBytes(32, function(err, buf) {
		if (err) {
			return next(err);
		}
		var token = buf.toString('hex');
		User.findOneAndUpdate({"email": req.body.email}, { passwordResetToken: token }, {}, function (err, user) {
			if (err) {
				return next(err);
			} else if (!user) {
				logger.info("Unknown email requested password reset: " + req.body.email);
				return res.send({});
			}
			if ('test' != env) {
				var url = conf.app.url_prefix + '#password-reset/' + user._id + '/' + token + '/' + hashEmail(user.email);
				logger.info("Password reset url for " + user.email + ": " + url);
				emailer.sendUserEmail(
					user,
					[
						{name: "URL", content: url}
					],
					'password-reset'
				);
			}
			return res.send({});
		});
	});
};

/**
 * PUT password change (for password reset).
 */
exports.passwordChange = function (req, res, next) {
	User.findOne({"_id": req.params.id}, function (err, user) {
		if (err) {
			return next(err);
		} else if (!user) {
			return next( {message: "User not found", status: 404} );
		} else if (utils.isEmpty(user.passwordResetToken) || req.body.token != user.passwordResetToken) {
			return next( {message: "Invalid token", status: 400} );
		} else if (utils.isEmpty(req.body.password)) {
			return next( {message: "Password is empty", status: 400} );
		}
		user.passwordResetToken = null;
		user.password = req.body.password;
		user.save(function (err) {
			if (err) {
				return next(err);
			}
			return res.send({});
		});
	});
};



/**
 * POST user registration.
 */
exports.register = function (req, res, next) {
	var errors = [];

	if (utils.isEmpty(req.body.name)) {
		errors.push( {message: "Name is empty"} );
	}
	if (!utils_shared.isValidEmail(req.body.email)) {
		errors.push( {message: "Invalid email address"} );
	}
	if (utils.isEmpty(req.body.password)) {
		errors.push( {message: "Password is empty"} )
	} else if (req.body.password.length < 6) {
		errors.push( {message: "Password too short"} );
	}

	if (errors.length !== 0) {
		return next( {errors: errors, status: 400} );
	} else {
		var names = req.body.name.split(" ");
		var firstname = names[0];
		var lastname = "";

		for (var i=1; i < names.length; i++) {
			lastname += names[i] + " ";
		}
		lastname = lastname.trim();

		var user = new User({
			firstname: firstname,
			lastname: lastname,
			email: req.body.email,
			password: req.body.password
		});

		if ('test' != env) {
			// Currently we just force user to become premium member immediately (for free)
			// TODO: When launching this should be removed!
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
					if (err.code == 11000) {
						return next({errors: "Email already registered", status: 400});
					}
					return next(err);
				} else {
					if ('test' != env) {
						emailer.sendUserEmail(
							user,
							[
								{name: "URL", content: conf.app.url_prefix + 'user/' + user._id + '/verify/' + hashEmail(user.email)}
							],
							'welcome'
						);
					}

					var createDirectories = function (next) {
						var userDir = path.join(conf.resources.usersDir, conf.epub.userDirPrefix + user._id);
						mkdirp(userDir, function (err) {
							if (err) {
								return next(err);
							} else {
								res.send({"user": user});
							}
						});
					}

					var numberOfStylesetsToBeCopied = stylesets.length;
					if (numberOfStylesetsToBeCopied == 0) {
						return createDirectories(next);
					} else {
						stylesets.forEach(function (styleset) {
							styleset.isSystem = false;
							styleset.members = [{userId: user._id, access: ["admin"]}];
							copyStyleset(styleset, function(err, copy) {
								if (err) {
									return next(err);
								}

								user.stylesets.addToSet(copy);

								if (copy.name === conf.user.defaultStylesetName) {
									user.defaultStyleset = copy;
								}

								numberOfStylesetsToBeCopied--;

								if (numberOfStylesetsToBeCopied == 0) {
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
				}
			});
		});
	}
};

/**
 * GET user validate.
 */
exports.verify = function (req, res) {
	User.findOne({"_id": req.params.id}, function (err, user) {
		var redirectUrl = conf.app.url_prefix + '?code=';
		if (err) {
			res.redirect(redirectUrl + "104");//Database problem
		} else if (!user) {
			res.redirect(redirectUrl + "101");//User not found
		} else if (req.params.hash != hashEmail(user.email)) {
			res.redirect(redirectUrl + "102");//Email not verified
		} else {
			user.emailValidated = true;
			user.save(function (err) {
				if (err) {
					res.redirect(redirectUrl + "104");//Database problem
				} else {
					res.redirect(redirectUrl + "100");//Email verified
				}
			});

			if (user.newsletter) {
				emailer.newsletterSubscribe(user);
			}
			// If the user previously had another email address, unsubscribe that from the newsletter
			if (user.oldEmail && user.email != user.oldEmail) {
				emailer.newsletterUnsubscribe(user.oldEmail);
			}
		}
	});
};

/**
 * PUT user profile edit.
 */
exports.edit = function (req, res, next) {
	var user = req.user;
	var firstname = req.body.firstname;
	var lastname = req.body.lastname;
	var email = req.body.email;
	var password = req.body.password;
	var newsletter = req.body.newsletter;
	var showArchived = req.body.showArchived;
	var showArchivedDocuments = req.body.showArchivedDocuments;
	var defaultStyleset = req.body.defaultStyleset;

	if (firstname) {
		user.firstname = firstname;
	}
	if (lastname) {
		user.lastname = lastname;
	}
	if (email && email != user.email) {
		if (!utils_shared.isValidEmail(email)) {
			return next({message: "Invalid email address", status: 400});
		} else {
			user.oldEmail = user.email;
			user.email = email;
			if ('test' != env) {
				emailer.sendUserEmail(
					user,
					[
						{name: "URL", content: conf.app.url_prefix + 'user/' + user._id + '/verify/' + hashEmail(user.email)}
					],
					'verify-email'
				);
			}
			user.emailValidated = false;
		}
	}
	if (password) {
		user.password = password;
	}
	if (typeof newsletter === "boolean") {
		if (!newsletter && user.newsletter) {
			emailer.newsletterUnsubscribe(user.email);
		} else if (newsletter && !user.newsletter && user.emailValidated) {
			emailer.newsletterSubscribe(user);
		}
		user.newsletter = newsletter;
	}
	if (typeof showArchived === "boolean") {
		user.showArchived = showArchived;
	}
	if (typeof showArchivedDocuments === "boolean") {
		user.showArchivedDocuments = showArchivedDocuments;
	}
	if (defaultStyleset) {
		user.defaultStyleset = defaultStyleset;
	}

	user.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({"user": user});
	});
};

exports.resendVerifyEmail = function (req, res, nxt) {
	emailer.sendUserEmail(
		user,
		[
			{name: "URL", content: conf.app.url_prefix + 'user/' + user._id + '/verify/' + hashEmail(user.email)}
		],
		'verify-email'
	);
	res.send({});
}

exports.sso = function (req, res, next) {
	if (!req.isAuthenticated()) {
		// User is not logged in.
		// Scripler account is required to use Discourse. Ask user to create an account.
		res.redirect(conf.app.url_prefix + "?code=510");
	} else {
		// User is already loggedin
		// Return user loggedin to Discourse.
		var sso = new discourse_sso(conf.discourse.ssoSecret);
		var payload = req.query.sso;
		var sig = req.query.sig;
		if (sso.validate(payload, sig)) {
			var nonce = sso.getNonce(payload);
			var userparams = {
				// Required, will throw exception otherwise
				"nonce":       nonce,
				"external_id": req.user._id,
				"email":       req.user.email,
				// Optional
				//"username": req.user.username,
				"name":        req.user.firstname + " " + req.user.lastname
			};
			var q = sso.buildLoginString(userparams);
			res.redirect(conf.discourse.url + "session/sso_login?" + q);
		} else {
			res.redirect(conf.app.url_prefix + "?code=505"); //Invalid Discourse SSO request
		}
	}
}
