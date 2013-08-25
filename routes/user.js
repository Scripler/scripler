var User = require('../models/user.js').User
    , passport = require('passport')
    , email = require('../lib/email/email.js')
    , crypto = require('crypto')
    , conf = require('config');

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
exports.list = function (req, res) {
    User.find({}, function (err, docs) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        } else {
            res.send({"users": docs});
        }
    });
};

/**
 * POST user login.
 */
exports.login = function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
        }
        if (!user) {
            res.send({"errorMessage": info.message}, 401);
        }
        req.logIn(user, function (err) {
            if (err) {
                res.send({"errorMessage": info.message}, 401);
            } else {
                res.send({"user": user});
            }
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
exports.register = function (req, res) {
    if (!isEmail(req.body.email)) {
        res.send({"errorMessage": "Invalid email address"}, 400);
    } else {
        var user = new User({
            name:     req.body.name,
            email:    req.body.email,
            password: req.body.password
        });
        if ('production' != global.env) {
            user.emailValidated = true;
        }
        user.save(function (err) {
            if (err) {
                // return error
                if (err.code == 11000) {
                    res.send({"errorMessage": "User already registered"}, 403);
                } else {
                    res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
                }
            } else {
                if ('test' != global.env) {
                    email.sendEmail({email: user.email, name: user.name, url: conf.app.url_prefix + 'user/' + user._id + '/verify/' + hashEmail(user.email)}, 'Validate your email', 'validate-email');
                }
                res.send({"user": user});
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
        }
    });
};

/**
 * PUT user profile edit.
 */
exports.edit = function (req, res) {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    if (name) {
        req.user.name = name;
    }
    if (email) {
        if (!isEmail(email)) {
            res.send({"errorMessage": "Invalid email address"}, 400);
            return;
        } else {
            req.user.email = email;
            if ('test' != global.env) {
                email.sendEmail({email: user.email, name: user.name, url: conf.app.url_prefix + 'user/' + user._id + '/validate/' + hashEmail(user.email)}, 'Validate your email', 'validate-email');
            }
            if ('production' != global.env) {
                user.emailValidated = true;
            }
        }
    }
    if (password) {
        req.user.password = password;
    }
    req.user.save(function (err) {
        if (err) {
            res.send({"errorCode": err.code, "errorMessage": "Database problem"}, 503);
        } else {
            res.send({"user": req.user});
        }
    });
};