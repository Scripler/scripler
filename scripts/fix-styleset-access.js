var Styleset = require('../models/styleset.js').Styleset;
var mongoose = require('mongoose');
var conf = require('config');

mongoose.connect(conf.db.uri);

Styleset.update({"name": {"$nin": conf.subscriptions.free.stylesets} }, {"$set": {"accessLevels": ['premium', 'professional']}}, {multi: true}, function(err, numAffected) {
	if (err) {
		cosole.log(err);
		return process.exit(1);
	}
	console.log("Updated " + numAffected + " stylesets to premium.");
	Styleset.update({"name": {"$in": conf.subscriptions.free.stylesets} }, {"$set": {"accessLevels": ['free', 'premium', 'professional']}}, {multi: true}, function(err, numAffected) {
		if (err) {
			cosole.log(err);
			return process.exit(1);
		}
		console.log("Updated " + numAffected + " stylesets to free.");
		process.exit(0);
	});
});