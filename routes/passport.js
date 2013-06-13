var express = require('express'),
    passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
    GoogleStrategy = require('passport-google').Strategy,
    LinkedInStrategy = require('passport-linkedin').Strategy,
    LocalStrategy = require('passport-local').Strategy,
//ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn,
    mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId,
    extend = require('xtend'),
    User = require('../models/user.js').User,
//crypto = require('crypto'),
    util = require('util'),
    conf = require('config')
//SALT = "s8(hb?.;*!sW"
    ;

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
            user.comparePassword(passwordpassword, function (err, isMatch) {
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
            // could not find user
            return done(null, false, { message: 'Unknown user ' + email });
        }
    });
}));

/*
 * PROVIDER ACCOUNTS
 */
passport.use(new TwitterStrategy({
        consumerKey:       conf.passport.twitter.consumerKey,
        consumerSecret:    conf.passport.twitter.consumerSecret,
        callbackURL:       conf.passport.twitter.callbackURL,
        passReqToCallback: true
    },
    function (req, token, tokenSecret, profile, done) {
        addProviderToUser(profile.provider, profile.id, profile, req.user, done);
    }
));

passport.use(new FacebookStrategy({
        clientID:          conf.passport.facebook.clientID,
        clientSecret:      conf.passport.facebook.clientSecret,
        callbackURL:       conf.passport.facebook.callbackURL,
        passReqToCallback: true,
        profileFields:     ['id', 'username', 'displayName', 'emails']
    },
    function (req, accessToken, refreshToken, profile, done) {
        addProviderToUser(profile.provider, profile.id, profile, req.user, done);
    }
));

passport.use(new GoogleStrategy({
        returnURL:         conf.passport.google.returnURL,
        realm:             conf.passport.google.realm,
        passReqToCallback: true
    },
    function (req, identifier, profile, done) {
        //console.log("DUMP: " + util.inspect(profile, false, null));
        addProviderToUser("google", identifier, profile, req.user, done);
    }
));

passport.use(new LinkedInStrategy({
        consumerKey:       conf.passport.linkedin.consumerKey,
        consumerSecret:    conf.passport.linkedin.consumerSecret,
        callbackURL:       conf.passport.linkedin.callbackURL,
        passReqToCallback: true,
        profileFields:     ['id', 'name', 'emails']
    },
    function (req, token, tokenSecret, profile, done) {
        addProviderToUser(profile.provider, profile.id, profile, req.user, done);
    }
));

function addProviderToUser(provider, providerId, profile, currentUser, done) {
    var providerObject = {"name": provider, "id": providerId};
    User.findOne({providers: {"$elemMatch": providerObject}}, function (err, user) {
        if (user) {
            //User already in database
            if (currentUser && currentUser._id != user._id) {
                console.log("Current user: " + currentUser);
                console.log("Database user: " + user);
                //TODO merge accounts?
                console.log("debug: " + "User already in database, and already logged in, but not with the same account! Merge!");
                done(null, currentUser);
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
                //TODO check if another account with same email address exists!
                console.log("debug: " + "New user");
                var user = new User();
                user.providers.addToSet(providerObject);
                user.name = profile.displayName;
                user.email = profile.emails[0].value;
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

function addProviderToUser(provider, providerId, profile, currentUser, done) {
    var providerObject = {"name": provider, "id": providerId};
    User.findOne({providers: {"$elemMatch": providerObject}}, function (err, user) {
        if (user) {
            //User already in database
            if (currentUser && currentUser._id != user._id) {
                console.log("Current user: " + currentUser);
                console.log("Database user: " + user);
                //TODO merge accounts?
                console.log("debug: " + "User already in database, and already logged in, but not with the same account! Merge!");
                done(null, currentUser);
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
                //TODO check if another account with same email address exists!
                console.log("debug: " + "New user");
                var user = new User();
                user.providers.addToSet(providerObject);
                user.name = profile.displayName;
                user.email = profile.emails[0].value;
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
    app.get('/auth/twitter', authnOrAuthz('twitter'));
    app.get('/auth/twitter/callback', passport.authenticate('twitter', { successReturnToOrRedirect: '/', failureRedirect: '/login' }));

    app.get('/auth/facebook', authnOrAuthz('facebook', { scope: ['email'] }));
    app.get('/auth/facebook/callback', passport.authenticate('facebook', { successReturnToOrRedirect: '/', failureRedirect: '/login' }));

    app.get('/auth/google', authnOrAuthz('google'));
    app.get('/auth/google/callback', passport.authenticate('google', { successReturnToOrRedirect: '/', failureRedirect: '/login' }));

    app.get('/auth/linkedin', authnOrAuthz('linkedin', {scope: ['r_basicprofile', 'r_emailaddress']}));
    app.get('/auth/linkedin/callback', passport.authenticate('linkedin', { successReturnToOrRedirect: '/', failureRedirect: '/login' }));
}

exports.initPaths = initPaths;