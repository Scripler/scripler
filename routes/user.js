var User = require('../models/user.js').User
	, passport = require('passport')
	, emailer = require('../lib/email/email.js')
	, crypto = require('crypto')
	, conf = require('config')
	, logger = require('../lib/logger')
	, env = process.env.NODE_ENV
	, fs = require('fs')
	, utils = require('../lib/utils')
	, utils_shared = require('../public/create/scripts/utils-shared')
	, user_utils = require('../lib/user-utils')
	, Styleset = require('../models/styleset.js').Styleset
	, discourse_sso = require('discourse-sso')
	, geoip = require('geoip-lite')
;

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
			var url = conf.app.url_prefix + '#password-reset/' + user._id + '/' + token + '/' + user_utils.hashEmail(user.email);
			logger.info("Password reset url for " + user.email + ": " + url);
			emailer.sendUserEmail(
				user,
				[
					{name: "URL", content: url}
				],
				'password-reset'
			);
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

		user_utils.initUser(user, function () {
			res.send({"user": utils.cleanUserObject(user)})
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
		} else if (req.params.hash != user_utils.hashEmail(user.email)) {
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
			user.emailVerified = false;
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

	// If upgrading from a demo account to real user with email-address, and user not already got a subscription,
	// add optional free premium months.
	if (emailChanged && userWasDemo && !user.payment.subscriptionId && !user.payment.endDate) {
		var freeMonth = parseInt(conf.user.freePremiumMonths);
		if (freeMonth > 0) {
			user.level = "premium";
			var endDate = new Date();
			endDate.setMonth(endDate.getMonth() + freeMonth);
			user.payment.endDate = endDate;
			logger.info("User '" + user.id + "' got " + freeMonth + " free months. End-date: " + endDate);
		}
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

			if (emailChanged) {
				var url = conf.app.url_prefix + 'user/' + user._id + '/verify/' + user_utils.hashEmail(user.email);
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
	var user = req.user;
	emailer.sendUserEmail(
		user,
		[
			{name: "URL", content: conf.app.url_prefix + 'user/' + user._id + '/verify/' + user_utils.hashEmail(user.email)}
		],
		'verify-email'
	);
	res.send({});
}

exports.sso = function (req, res, next) {
	if (!req.isAuthenticated() || req.user.isDemo) {
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

/**
 * GET users country based on ip.
 */
exports.getCountry = function (req, res) {
	var ip = req.ip;
	// For IPv6, req.ip can be '::ffff:127.0.0.1"'.
	// Geolite needs IPv4, so strip IPv6 in these cases
	if ( ip.indexOf('::ffff:') >= 0 ) {
		ip = ip.split(':').reverse()[0]
	}
	var countryCode = 'DK';
	var lookedUpIP = geoip.lookup(ip)
	if ( lookedUpIP && lookedUpIP.country ) {
		countryCode = lookedUpIP.country;
	}
	res.send({"country": countryCode});
};
