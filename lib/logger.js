var winston = require('winston');

if ('test' == process.env.NODE_ENV) {
    var logger = winston;
    logger.remove(winston.transports.Console);
} else {
    var logger = new (winston.Logger)({
        transports:        [
            new winston.transports.Console({ json: false, timestamp: true, colorize: true }),
            new winston.transports.File({ filename: __dirname + '/../debug.log', json: false })
        ],
        exceptionHandlers: [
            new winston.transports.Console({ json: true, timestamp: true, colorize: true }),
            new winston.transports.File({ filename: __dirname + '/../exceptions.log', json: false })
        ],
        exitOnError:       false
    });
}

module.exports = logger;