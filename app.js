var express = require('express')
	, http = require('http')
	, fs = require('fs')
	, mongoose = require('mongoose')
	, conf = require('config')
	, auth = require('./lib/auth')
	, logger = require('./lib/logger')
	, routes = require('./routes')
	, expressConf = require('./config/express');

var app = express();

// Database connect
logger.info("Trying to connect to MongoDB: " + conf.db.uri)
mongoose.connect(conf.db.uri, function(err) {
	if (err) {
		logger.error("MongoDB error: " + JSON.stringify(err))
		process.exit(1);
	}
	logger.info("Connected to MongoDB!");
	// Since database is now running, we can initialize the app
	expressConf.beforeRoutes(app, conf, mongoose);
	routes(app, auth);
	auth.initPaths(app);
	expressConf.afterRoutes(app, conf, mongoose);

	http.createServer(app).listen(app.get('port'), function () {
		logger.info('Express server listening on port ' + app.get('port') + ('development' == app.get('env') ? ' - in development mode!' : ''));
	});

});

