var winston = require('winston');
var strftime = require('strftime');
var conf = require('config');

function customTimestamp() {
	return strftime('%F %T%z', new Date());
}
if ('development' == process.env.NODE_ENV) {
	var logger = winston;
} else if ('test' == process.env.NODE_ENV) {
	var logger = winston;
	logger.remove(winston.transports.Console);
} else {
	var logger = new (winston.Logger)({
		transports: [
			new winston.transports.Console({ level: conf.app.logLevel, json: false, timestamp: customTimestamp, colorize: true }),
			new winston.transports.File({ level: conf.app.logLevel, filename: __dirname + '/../debug.log', timestamp: customTimestamp, json: false })
		],
		exceptionHandlers: [
			new winston.transports.Console({ json: false, timestamp: customTimestamp, colorize: true }),
			new winston.transports.File({ filename: __dirname + '/../exceptions.log', timestamp: customTimestamp, json: false })
		],
		exitOnError: false
	});
}

module.exports = logger;