var user = require('./user');

exports.index = function (req, res) {
    res.render('index', {user: req.user});
};
exports.account = function (req, res) {
    res.render('account', { user: req.user });
};
exports.login = function (req, res) {
    res.render('login', { user: req.user, message: req.session.messages });
};

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