var User = require('../models/user.js').User;

exports.changeLevel = function (userId, level, done) {
	User.findOne({_id: userId}, function(err, user) {
		if (err) {
			return done(err);
		}
		user.level = level;
		user.save(function (err, user) {
			if (err) {
				return done(err);
			}
			return done();
		});
	});
}
