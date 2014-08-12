var User = require('../models/user.js').User;

exports.changeLevel = function (userId, level, next) {
	User.findOne({_id: userId}, function(err, user) {
		if (err) {
			return next(err);
		}
		user.level = level;
		user.save(function (err, user) {
			if (err) {
				return next(err);
			}
			return next();
		});
	});
}
