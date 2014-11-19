var express = require('express'),
	passport = require('passport'),
	FacebookStrategy = require('passport-facebook').Strategy,
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
	LinkedInStrategy = require('passport-linkedin').Strategy,
	LocalStrategy = require('passport-local').Strategy,
	mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId,
	extend = require('xtend'),
	User = require('../models/user.js').User,
	util = require('util'),
	logger = require('./logger'),
	conf = require('config'),
	user_utils = require('./user-utils');

passport.serializeUser(function (user, done) {
	done(null, user._id);
});

passport.deserializeUser(function (uid, done) {
	User.findOne({_id: uid}, function (err, user) {
		done(err, user);
	});
});

/*
 * LOCAL ACCOUNT
 */

// Use the LocalStrategy within Passport.
passport.use(new LocalStrategy({usernameField: 'email'}, function (email, password, done) {
	User.findOne({"email": email}, function (err, user) {
		if (err) {
			return done(err);
		} else if (user) {
			// check if password is matchings
			if (user.password) {
				user.comparePassword(password, function (err, isMatch) {
					if (err) {
						return done(err);
					} else if (isMatch) {
						return done(null, user);
					} else {
						// invalid password
						return done(null, false, { message: 'Invalid password' });
					}
				});
			} else {
				return done(null, false, { message: 'User has no local password!'});
			}
		} else {
			// could not find user
			return done(null, false, { message: 'Unknown user ' + email });
		}
	});
}));

/*
 * PROVIDER ACCOUNTS
 */
passport.use(new FacebookStrategy({
		clientID: conf.passport.facebook.clientID,
		clientSecret: conf.passport.facebook.clientSecret,
		callbackURL: conf.passport.facebook.callbackURL,
		passReqToCallback: true,
		profileFields: ['id', 'username', 'name', 'emails']
	},
	function (req, accessToken, refreshToken, profile, done) {
		addProviderToUser(profile.provider, profile.id, profile, req.user, done);
	}
));

passport.use(new GoogleStrategy({
		clientID: conf.passport.google.clientID,
		clientSecret: conf.passport.google.clientSecret,
		callbackURL: conf.passport.google.callbackURL
	},
	function (req, accessToken, refreshToken, profile, done) {
		addProviderToUser(profile.provider, profile.id, profile, req.user, done);
	}
));

passport.use(new LinkedInStrategy({
		consumerKey: conf.passport.linkedin.consumerKey,
		consumerSecret: conf.passport.linkedin.consumerSecret,
		callbackURL: conf.passport.linkedin.callbackURL,
		passReqToCallback: true,
		profileFields: ['id', 'name', 'emails']
	},
	function (req, token, tokenSecret, profile, done) {
		addProviderToUser(profile.provider, profile.id, profile, req.user, done);
	}
));

function addProviderToUser(provider, providerId, profile, currentUser, done) {
	var providerObject = {"name": provider, "id": providerId};
	var email;
	if (profile.emails && profile.emails.length > 0) {
		email = profile.emails[0].value;
	} else {
		//TODO Do something when we don't get an email from the provider
		logger.error("error: " + "We got no email from provider! What to do?");
	}
	//TODO Currently merges account if email already exists... Is this acceptable to do?
	User.findOne({email: email}, function (err, user) {
		if (user && !user.isDemo) {
			//User already in database
			var providerAlreadyAttached = false;
			for (var i = 0; i < user.providers.length; i++) {
				if (user.providers[i].name == provider) {
					providerAlreadyAttached = true;
					break;
				}
			}
			// If the user is currently loggedin, we want the modify this user object - otherwise we use the database bject.
			if (!currentUser) {
				currentUser = user;
			}

			if (!providerAlreadyAttached) {
				currentUser.providers.addToSet(providerObject);
				currentUser.markModified('providers');//"providers" is of type "Mixed", so Mongoose, doesn't detect the change.
				currentUser.save(function (err) {
					if (err) {
						throw err;
					}
					done(null, currentUser);
				});
			} else {
				logger.debug("Nothing to do... User already has this account attached");
				done(null, currentUser);
			}
		} else {
			if (currentUser && !currentUser.isDemo) {
				//User already loggedin, so add new provider to user
				var user = currentUser;
				logger.debug("User already loggedin, so add new provider to user");
				user.providers.addToSet(providerObject);
				done(null, user);
			} else {
				//New user
				var user = new User();
				user.providers.addToSet(providerObject);
				user.firstname = profile.name.givenName;
				user.lastname = profile.name.familyName;
				user.emailVerified = true;
				if (profile.name.middleName) {
					user.lastname = profile.name.middleName + " " + user.lastname;
				}
				if (profile.emails && profile.emails.length > 0) {
					user.email = profile.emails[0].value;
				}
			}
			user.markModified('providers');//"providers" is of type "Mixed", so Mongoose, doesn't detect the change.
			user.save(function (err) {
				if (err) {
					throw err;
				}

				user_utils.initUser(user, function () {
					done(null, user);
				});
			});
		}
	})
}

function authnOrAuthz(provider, options) {
	return function (req, res, next) {
		if (!req.isAuthenticated()) {
			passport.authenticate(provider, extend(options, {
				successRedirect: '/settings/accounts', failureRedirect: '/login'
			}))(req, res, next);
		} else {
			passport.authorize(provider)(req, res, next);
		}
	}
}

function initPaths(app) {
	app.get('/auth/facebook', authnOrAuthz('facebook', { scope: ['email'] }));
	app.get('/auth/facebook/callback', passport.authenticate('facebook', { successReturnToOrRedirect: '/create/', failureRedirect: '/' }));

	app.get('/auth/google', authnOrAuthz('google', { scope: ['profile', 'email']}));
	app.get('/auth/google/callback', passport.authenticate('google', { successReturnToOrRedirect: '/create/', failureRedirect: '/', scope: 'https://www.googleapis.com/auth/plus.login' }));

	app.get('/auth/linkedin', authnOrAuthz('linkedin', {scope: ['r_basicprofile', 'r_emailaddress']}));
	app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { successReturnToOrRedirect: '/create/', failureRedirect: '/' }));
}

function isLoggedIn() {
	return function (req, res, next) {
		if (!req.isAuthenticated()) {
			return res.status(401).send({"errorMessage": "User not authenticated"});
		} else {
			next();
		}
	}
}

exports.initPaths = initPaths;
exports.isLoggedIn = isLoggedIn;
