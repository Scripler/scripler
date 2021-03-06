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
	, multipart = require('connect-multiparty')
	, dot = require('express-dot-engine');


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
// TODO: when running "mocha", it seems that the value from config/runtime.json is used, even though "conf.import.uploadDir" is specified in config/test.json used by test/it.js - why?
if (!conf.import.uploadDir || conf.import.uploadDir == "") {
    conf.import.uploadDir = __dirname + '/../tmp/uploads';
}
// Ensure that uploadDir exists
mkdirp(conf.import.uploadDir, function (err) {
	if (err) console.error(err);
});

exports.beforeRoutes = function (app, conf, mongoose) {

	// all environments
	app.set('port', conf.app.port);
	app.set('trust proxy', 'loopback');
	//TODO: Don't allow cross domain in production
	//if ('development' == app.get('env')) {
		// development only
		app.use(allowCrossDomain);
	//}
	app.use(expressLogger('short', {stream: {write: function (msg) {
		logger.info(msg.trim());
	}}}));
	app.engine('dot', dot.__express);
	app.set('views', path.join(__dirname, '../views'));
	app.set('view engine', 'dot');
	// TODO: create a separate configuration value for this?
	app.use(bodyParser.json({limit: conf.import.uploadLimit }));
	app.use(bodyParser.urlencoded({ limit: conf.import.uploadLimit, extended: false }));
	app.use(multipart({
		uploadDir: conf.import.uploadDir,
		keepExtensions: true,
		maxFieldsSize: conf.import.uploadLimit
	}));
	app.use(methodOverride());
	app.use(cookieParser(conf.app.cookie_secret));
	app.use(session({
		secret: conf.app.session_secret,
		resave: true,
		saveUninitialized: true,
		cookie: {
			maxAge: conf.app.cookie_expire
		},
		store: new MongoStore({
			mongooseConnection: mongoose.connection
		})
	}));
	app.use(passport.initialize());
	app.use(passport.session());
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
		} else if (typeof err == "string") {
			err = {status: 500, message: err};
		}

		if (err.errors) {
			err.err = err.errors;
		}
		if (err.stack) {
			logger.error(err.stack);
		} else {
			logger.error(err);
		}

		res.status(err.status || 500).send({ "errorCode": err.code, "errorMessage": err.message, "errorDetails": err.err});
	});
}
