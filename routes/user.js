var User = require('../models/user.js').User
    , passport = require('passport');

/**
 * GET users listing.
 */
exports.list = function (req, res) {
    User.find({}, function (err, docs) {
        if (err) {
            res.send({"status": 0, "error": err.code, "error_text": err.err});
        } else {
            res.send({"status": 1, "users": docs});
        }
    });
};

/**
 * POST user login.
 */
exports.login = function (req, res, next) {
    //    passport.authenticate('local', function (err, user, info) {
    //        if (err) {
    //            return next(err)
    //        }
    //        if (!user) {
    //            req.session.messages = [info.message];
    //            //return res.redirect('/login')
    //        }
    //        req.logIn(user, function (err) {
    //            if (err) {
    //                return next(err);
    //            }
    //            //return res.redirect('/');
    //        });
    //    })(req, res, next);

    User.findOne({"email": req.body.email}, function (err, user) {
        if (err) {
            // return error
            res.send({"status": -err.code, "errorMessage": "Database problem", "errorDetails": err.err});
        } else if (user) {
            // check if password is matchings
            user.comparePassword(req.body.password, function (err, isMatch) {
                if (err) {
                    // return error
                    res.send({"status": -err.code, "errorMessage": "Database problem", "errorDetails": err.err});
                } else if (isMatch) {
                    res.send({"status": 0, "user": user});
                } else {
                    // invalid password
                    res.send({"status": -1, "errorMessage": "Invalid user password"});
                }
            });
        } else {
            // could not find user
            res.send({"status": -2, "errorMessage": "Unknown user"});
        }
    });

};

/**
 * POST user logout.
 */
exports.logout = function (req, res) {
    res.send({"status": 0});
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
                res.send({"status": -1, "errorMessage": "User already registered"});
            } else {
                res.send({"status": -err.code, "errorMessage": "Database problem", "errorDetails": err.err});
            }
        } else {
            res.send({"status": 0});
        }
    });
};