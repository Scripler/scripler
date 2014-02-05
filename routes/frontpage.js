var user = require('./user')
	, passport = require('passport');

exports.index = function (req, res) {
	res.render('index', {user: req.user});
};
exports.account = function (req, res) {
	res.render('account', { user: req.user });
};
exports.login = function (req, res) {
	res.render('login', { user: req.user, message: req.session.messages });
};

exports.loginPost = function (req, res, next) {
	passport.authenticate('local', function (err, user, info) {
		if (err) {
			return next(err)
		}
		if (!user) {
			req.session.messages = [info.message];
			return res.redirect('/login')
		}
		req.logIn(user, function (err) {
			if (err) {
				return next(err);
			}
			return res.redirect('/');
		});
	})(req, res, next);
}

exports.logout = function (req, res, next) {
	req.logout();
	res.redirect('/');
}

exports.newUser = function (req, res) {
	res.render('new-user', { user: req.user, message: req.session.messages });
};

exports.newUserPost = function (req, res, next) {
	//res.send(util.inspect(req.body, false, null));
	var email = req.body.email
	if (!email) {
		req.session.messages = ["You need to enter an email address!"];
		return res.redirect('/new-user');
	}
	user.register(req, res);
}