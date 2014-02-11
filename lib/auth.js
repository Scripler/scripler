var express = require('express'),
	passport = require('passport'),
	FacebookStrategy = require('passport-facebook').Strategy,
	GoogleStrategy = require('passport-google').Strategy,
	LinkedInStrategy = require('passport-linkedin').Strategy,
	LocalStrategy = require('passport-local').Strategy,
	mongoose = require('mongoose'),
	ObjectId = mongoose.Types.ObjectId,
	extend = require('xtend'),
	User = require('../models/user.js').User,
	util = require('util'),
	conf = require('config');

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
			if (!user.emailValidated) {
				return done(null, false, { message: 'Users email address has not been validated!'});
			} else if (user.password) {
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
		returnURL: conf.passport.google.returnURL,
		realm: conf.passport.google.realm,
		passReqToCallback: true
	},
	function (req, identifier, profile, done) {
		//console.log("DUMP: " + util.inspect(profile, false, null));
		addProviderToUser("google", identifier, profile, req.user, done);
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
		console.log("error: " + "We got no email from provider! What to do?");
	}
	//TODO Currently merges account if email already exists... Is this acceptable to do?
	User.findOne({"$or": [
		{email: email},
		{providers: {"$elemMatch": providerObject}}
	]}, function (err, user) {
		if (user) {
			//User already in database
			if (currentUser && currentUser._id != user._id) {
				console.log("Current user: " + currentUser);
				console.log("Database user: " + user);
				//TODO Maybe we shouldn't automatically merge accounts?
				console.log("debug: " + "User already in database, and already logged in, but not with the same account! Merge!");
				currentUser.providers.addToSet(providerObject);
				currentUser.markModified('providers');//"providers" is of type "Mixed", so Mongoose, doesn't detect the change.
				currentUser.save(function (err) {
					if (err) {
						throw err;
					}
					done(null, currentUser);
				});
			} else {
				console.log("debug: " + "Nothing to do... User already has this account attached");
				done(null, user);
			}
		} else {
			if (currentUser) {
				//User already loggedin, so add new provider to user
				var user = currentUser;
				console.log("debug: " + "User already loggedin, so add new provider to user");
				user.providers.addToSet(providerObject);
				done(null, user);
			} else {
				//New user
				var user = new User();
				user.providers.addToSet(providerObject);
				user.firstname = profile.name.givenName;
				user.lastname = profile.name.familyName;
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
				done(null, user);
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
	app.get('/auth/facebook/callback', passport.authenticate('facebook', { successReturnToOrRedirect: '/', failureRedirect: '/login' }));

	app.get('/auth/google', authnOrAuthz('google'));
	app.get('/auth/google/callback', passport.authenticate('google', { successReturnToOrRedirect: '/', failureRedirect: '/login' }));

	app.get('/auth/linkedin', authnOrAuthz('linkedin', {scope: ['r_basicprofile', 'r_emailaddress']}));
	app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { successReturnToOrRedirect: '/', failureRedirect: '/login' }));
}

function isLoggedIn() {
	return function (req, res, next) {
		if (!req.isAuthenticated || !req.isAuthenticated()) {
			return res.send({"errorMessage": "User not authenticated"}, 403);
		} else {
			next();
		}
	}
}

exports.initPaths = initPaths;
exports.isLoggedIn = isLoggedIn;
