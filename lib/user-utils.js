var User = require('../models/user.js').User;

exports.makePremium = function (userId) {
	User.findOne({_id: userId}, function(err, user) {
		if (err) {
			return next(err);
		}
		user.level = "premium";
		user.save(function (err, user) {
			if (err) {
				callback(err);
			}
			return user;
		});
	});
}
