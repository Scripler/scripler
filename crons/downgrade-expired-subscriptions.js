/**
 * This script will downgrade all cancelled subscribers that have ended their current billing cycle.
 *
 * Should be run once every night after midnight.
 *
 */
var conf = require('config');
var emailer = require('../lib/email/email.js');
var User = require('../models/user.js').User;
var logger = require('../lib/logger');
var async = require('async');
var mongoose = require('mongoose');

mongoose.connect(conf.db.uri, function(err) {
	if (err) {
		logger.error("MongoDB error: " + JSON.stringify(err))
		process.exit(1);
	}

	var currentDate = new Date();
	// Set hour, minute, seconds to midnight. Use UTC format, since that's what Mongo stores dates in.
	currentDate.setUTCHours(0);
	currentDate.setUTCMinutes(0);
	currentDate.setUTCSeconds(0);

	logger.info("Looking for subscribers where their end-date has passed: " + currentDate.toISOString());

	// Use less-than, since
	User.find({"payment.endDate": {$lt: currentDate}}, function (err, users) {
		if (err) {
			logger.error("Could not get cancelled subscribers to downgrade: " + JSON.stringify(err))
			process.exit(1);
		}

		if (users.length > 0) {
			logger.info("Found " + users.length + " subscribers");
			async.each(users, function (user, callback) {
				logger.info("Handling: " + user.id);
				var oldEndDay = user.payment.endDate;
				user.payment.endDate = null;
				user.payment.cancelled = null;
				user.level = 'free';
				user.save(function (err, user) {
					if (err) {
						logger.error("Could not downgrade user " + user.id)
						return callback(err);
					}
					logger.info("User " + user.id + " was downgraded because his cancelled subscription (" + user.payment.subscriptionId + ") expired. Its last day was: " + oldEndDay);
					return callback();
				});
			}, function (err) {
				if (err) {
					logger.error("Subscription downgrade script failed: " + JSON.stringify(err))
					return;
				}
				logger.info("Successfully downgraded " + users.length + " users.");
				process.exit(0);
			});

		} else {
			logger.info("No users to downgrade. All good!");
			process.exit(0);
		}

	});

});