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
	, styleset_utils = require('../lib/styleset-utils')
	, mkdirp = require('mkdirp')
	, Styleset = require('../models/styleset.js').Styleset
	, copyStyleset = require('../models/styleset.js').copy
	, discourse_sso = require('discourse-sso')
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

			return res.send({"user": utils.cleanUserObject(user)});
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
		var nameParts = utils_shared.getNameParts(req.body.name);
		var user = new User({
			firstname: nameParts.firstname,
			lastname: nameParts.lastname,
			email: req.body.email,
			password: req.body.password,
			isDemo: req.body.isDemo
		});

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
					if ('test' != env) {
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
				}

				var createDirectories = function (next) {
					var userDir = path.join(conf.resources.usersDir, conf.epub.userDirPrefix + user._id);
					mkdirp(userDir, function (err) {
						if (err) {
							return next(err);
						} else {
							return res.send({"user": utils.cleanUserObject(user)});
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
			if (user.emailVerified) {
				res.redirect(redirectUrl + "200");//Email already verified
			} else {
				user.emailVerified = true;
				user.save(function (err) {
					if (err) {
						res.redirect(redirectUrl + "104");//Database problem
					} else {
						res.redirect(redirectUrl + "100");//Email verified
					}
				});

				if (user.newsletter) {
					emailer.newsletterSubscribe(user);
				} else {
					emailer.newsletterUnsubscribe(user.email);
				}
				// If the user previously had another email address, unsubscribe that from the newsletter
				if (user.oldEmail && user.email != user.oldEmail) {
					emailer.newsletterUnsubscribe(user.oldEmail);
		}
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
	var passwordOld = req.body.passwordOld;
	var newsletter = req.body.newsletter;
	var showArchived = req.body.showArchived;
	var showArchivedDocuments = req.body.showArchivedDocuments;
	var defaultStyleset = req.body.defaultStyleset;
	var isDemo = req.body.isDemo;
	var userWasDemo = user.isDemo;
	var emailChanged = false;

	// Change from demo user's name to real name
	if (req.body.name) {
		var nameParts = utils_shared.getNameParts(req.body.name);
		req.user.firstname = nameParts.firstname;
		req.user.lastname = nameParts.lastname;
	} else {
		if (firstname) {
			user.firstname = firstname;
		}
		if (lastname) {
			user.lastname = lastname;
		}
	}
	if (email && email != user.email) {
		if (!utils_shared.isValidEmail(email)) {
			return next({message: "Invalid email address", status: 400});
		} else {
			if (user.emailVerified) {
				// Store users last verified email for later
				user.oldEmail = user.email;
			}
			user.email = email;
			emailChanged = true;
			// The email will be send later when we successfully persisted the user,
			// so that we don't send out any emails for failed registrations
		}
	}

	if (typeof newsletter === "boolean") {
		// If email address is verified, any newsletter subscription changes will be done immediately.
		// If email address is not verified, any newsletter subscription changes will be done when the verification is successfull.
		if (user.emailVerified) {
			if (!newsletter && user.newsletter) {
				emailer.newsletterUnsubscribe(user.email);
			} else if (newsletter && !user.newsletter) {
				emailer.newsletterSubscribe(user);
			}
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
	if (typeof isDemo === "boolean") {
		user.isDemo = isDemo;
	}

	var saveUser = function () {
		user.save(function (err) {
			if (err) {
				// Code is either 11000 or 11001, c.f.: http://nraj.tumblr.com/post/38706353543/handling-uniqueness-validation-in-mongo-mongoose
				if (err.code && (err.code === 11000 || err.code === 11001)) {
					return next({errors: "Email already registered", status: 400});
				}

				return next(err);
			}

			if (emailChanged && 'test' != env) {
				var url = conf.app.url_prefix + 'user/' + user._id + '/verify/' + hashEmail(user.email);
				logger.info("Password verify url for " + user.email + ": " + url);
				var template = 'verify-email';
				if (userWasDemo) {
					// If user was a demo-user before, send welcome email instead of verify email.
					template = 'welcome';
				}
				emailer.sendUserEmail(
					user,
					[
						{name: "URL", content: url}
					],
					template
				);
			}
			
			return res.send({"user": utils.cleanUserObject(user)});
		})
	};

	// When changing password, and this is not an initial registration, the correct old password must also be provided.
	if (password) {
		if (userWasDemo) {
			user.password = password;
			saveUser();
		} else if (passwordOld) {
			user.comparePassword(passwordOld, function (err, isMatch) {
				if (err) {
					return next(err);
				} else if (isMatch) {
					// Old password was correct - do the password change
					user.password = password;
					saveUser();
				} else {
					// invalid old password
					return next({message: "Invalid old password", status: 401});
				}
			});
		} else {
			// If frontend sends 'password' but not 'passwordOld', and the user was not a demo user,
			// we justs ignore it - it's just the frontend sending the password from the model, without
			// any intention to change it.
			saveUser();
		}
	} else {
		saveUser();
	}

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
				"nonce":       nonce,
				"external_id": req.user.id,
				"email":       req.user.email,
				"name":        req.user.firstname + " " + req.user.lastname
			};
			var q = sso.buildLoginString(userparams);
			res.redirect(conf.discourse.url + "session/sso_login?" + q);
		} else {
			res.redirect(conf.app.url_prefix + "?code=505"); //Invalid Discourse SSO request
		}
	}
}
