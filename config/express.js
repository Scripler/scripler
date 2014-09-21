var express = require('express')
	, passport = require('passport')
	, session = require('express-session')
	, MongoStore = require('connect-mongo')(session)
	, path = require('path')
	, logger = require('../lib/logger')
	, expressLogger = require('morgan')
	, conf = require('config')
	, mkdirp = require('mkdirp')
	, methodOverride = require('method-override')
	, cookieParser = require('cookie-parser')
	, bodyParser = require('body-parser')
	, multipart = require('connect-multiparty');


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

// If uploadDir hasn't been specified in configuration folder, default to subfolder in current dir
if (conf.import.uploadDir == "") {
    conf.import.uploadDir = __dirname + '/../tmp/uploads';
}
// Ensure that uploadDir exists
mkdirp(conf.import.uploadDir, function (err) {
	if (err) console.error(err);
});

exports.beforeRoutes = function (app, conf, mongoose) {

	// all environments
	app.set('port', conf.app.port);
	//TODO: Don't allow cross domain in production
	//if ('development' == app.get('env')) {
		// development only
		app.use(allowCrossDomain);
	//}
	app.use(expressLogger('short', {stream: {write: function (msg) {
		logger.info(msg.trim());
	}}}));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(multipart({
		uploadDir: conf.import.uploadDir,
		keepExtensions: true,
		maxFieldsSize: '15728640'//15mb
	}));
	app.use(methodOverride());
	app.use(cookieParser(conf.app.cookie_secret));
	app.use(session({
		secret: conf.app.session_secret,
		resave: true,
		saveUninitialized: true,
			cookie: {
			maxAge: 30 * 24 * 3600000 // 30 days.
		},
		store: new MongoStore({
			db: mongoose.connection.db
		})
	}));
	app.use(passport.initialize());
	app.use(passport.session());
	//app.use(app.router);

}


exports.afterRoutes = function (app) {
	app.use(express.static(path.join(__dirname, '../public')));
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
