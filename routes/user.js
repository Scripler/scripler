var User = require('../models/user.js').User
	, passport = require('passport')
	, emailer = require('../lib/email/email.js')
	, crypto = require('crypto')
	, conf = require('config')
	, mcapi = new require('mailchimp-api')
	, logger = require('../lib/logger')
	, conf = require('config')
	, env = process.env.NODE_ENV
	, path = require('path')
	, fs = require('fs');
;

var mc = new mcapi.Mailchimp(conf.mailchimp.apiKey);

function isEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
		req.logIn(user, function (err) {
			if (err) {
				return next(err);
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
 * POST user registration.
 */
exports.register = function (req, res, next) {
	var errors = [];

	if (req.body.name === "") {
		errors.push( {message: "Name is empty"} );
	}
	if (!isEmail(req.body.email)) {
		errors.push( {message: "Invalid email"} );
	}
	if (req.body.password === "") {
		errors.push( {message: "Password is empty"} )
	}
	if (req.body.password.length < 8) {
		errors.push( {message: "Password too short"} );
	}

	if (errors.length !== 0){
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
		if ('production' != env) {
			user.emailValidated = true;
		}
		user.save(function (err) {
			if (err) {
				// return error
				if (err.code == 11000) {
					return next({message: "User already registered", status: 400});
				}
				return next(err);
			} else {
				if ('test' != env) {
					emailer.sendEmail({email: user.email, name: user.firstname, url: conf.app.url_prefix + 'user/' + user._id + '/verify/' + hashEmail(user.email)}, 'Verify your email', 'verify-email');
				}

				var userDir = path.join(conf.resources.usersDir, conf.epub.userDirPrefix + user._id);
				fs.mkdir(userDir, function (err) {
					if (err) {
						return next(err);
					} else {
						res.send({"user": user});
					}
				});
			}
		});
	}
};

/**
 * GET user validate.
 */
exports.verify = function (req, res) {
	User.findOne({"_id": req.params.id}, function (err, user) {
		var redirectUrl = conf.app.url_prefix + '?err=';
		if (err) {
			res.redirect(redirectUrl + "Database problem");
		} else if (!user) {
			res.redirect(redirectUrl + "User not found");
		} else if (req.params.hash != hashEmail(user.email)) {
			res.redirect(redirectUrl + "User not validated");
		} else {
			user.emailValidated = true;
			user.save(function (err) {
				if (err) {
					res.redirect(redirectUrl + "Database problem");
				} else {
					res.redirect(redirectUrl);
				}
			});

			mc.lists.subscribe({
				id: conf.mailchimp.memberListId,
				double_optin: false,
				update_existing: true,
				email: {email: user.email},
				merge_vars: {
					groupings: [
						{id: conf.mailchimp.memberGroupId, groups: [conf.mailchimp.memberGroupIdFree]}
					],
					FNAME: user.firstname,
					LNAME: user.lastname
				}
			}, function (data) {
				logger.info("MailChimp subscribe successful: " + user.email);
			}, function (error) {
				logger.error("MailChimp subscribe error: " + user.email + " - " + error.code + " - " + error.error);
			});
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
	if (firstname) {
		req.user.firstname = firstname;
	}
	if (lastname) {
		req.user.lastname = lastname;
	}
	if (email) {
		if (!isEmail(email)) {
			return next({message: "Invalid email address", status: 400});
		} else {
			req.user.email = email;
			if ('test' != env) {
				emailer.sendEmail({email: user.email, name: user.firstname, url: conf.app.url_prefix + 'user/' + user._id + '/verify/' + hashEmail(user.email)}, 'Verify your email', 'verify-email');
			}
			if ('production' != env) {
				user.emailValidated = true;
			}
		}
	}
	if (password) {
		req.user.password = password;
	}
	req.user.save(function (err) {
		if (err) {
			return next(err);
		}
		res.send({"user": req.user});
	});
};
