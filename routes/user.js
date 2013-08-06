var User = require('../models/user.js').User
    , passport = require('passport');

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
    var user = new User({
        name:     req.body.name,
        email:    req.body.email,
        password: req.body.password
    });
    user.save(function (err) {
        if (err) {
            // return error
            if (err.code == 11000) {
                res.send({"errorMessage": "User already registered"}, 403);
            } else {
                res.send({"errorCode": err.code, "errorMessage": "Database problem", "errorDetails": err.err}, 503);
            }
        } else {
            res.send({"user": user});
        }
    });
};