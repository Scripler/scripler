var express = require('express')
	, passport = require('passport')
	, MongoStore = require('connect-mongo')(express)
	, path = require('path')
	, logger = require('../lib/logger');


var allowCrossDomain = function (req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept');
	// intercept OPTIONS method
	if ('OPTIONS' == req.method) {
		res.send(200);
	} else {
		next();
	}
};

module.exports = function (app, conf, mongoose) {

	// all environments
	app.set('port', conf.app.port);
	//TODO: Don't allow cross domain in production
	//if ('development' == app.get('env')) {
		// development only
		app.use(allowCrossDomain);
	//}
	app.use(express.logger({format: 'short', stream: {write: function (msg) {
		logger.info(msg.trim());
	}}}));
	app.use(express.bodyParser({
		uploadDir: __dirname + '/../tmp/uploads',
		keepExtensions: true,
		maxFieldsSize: '15728640'//15mb
	}));
	app.use(express.methodOverride());
	app.use(express.cookieParser(conf.app.cookie_secret));
	app.use(express.session({
		secret: conf.app.session_secret,
		maxAge: new Date(Date.now() + 3600000),
		store: new MongoStore({db: mongoose.connection.db})
	}));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));

	//Catch-all error handler
	app.use(function (err, req, res, next) {
		if (typeof err == "number") {
			var httpCodes = [];
			httpCodes[0] = "Unknown Error";
			httpCodes[403] = "Access Denied";
			httpCodes[404] = "Not Found";
			err = {status: err, message: httpCodes[err] || httpCodes[0]};
		}
		if (err.errors) {
			err.err = err.errors;
		}
		if (err.stack) {
			logger.error(err.stack);
		} else {
			logger.error(err);
		}
		res.send({ "errorCode": err.code, "errorMessage": err.message, "errorDetails": err.err}, err.status || 500);
	});
}
