var express = require('express')
    , http = require('http')
    , https = require('https')
    , fs = require('fs')
    , mongoose = require('mongoose')
    , conf = require('config')
    , auth = require('./lib/auth')
    , logger = require('./lib/logger');

var app = express();
var env = app.get('env');

// db connect
mongoose.connect(conf.db.uri);

require('./config/express')(app, conf, mongoose);
require('./routes')(app, auth);
auth.initPaths(app);

if ('production' == env) {
    var sslOptions = {
        key: fs.readFileSync('config/ssl/scripler-key.pem'),
        cert: fs.readFileSync('config/ssl/scripler-cert.pem')
    };
    https.createServer(sslOptions,app).listen(app.get('port'), function () {
        logger.info('Express server listening on port ' + app.get('port') + ' (HTTPS)');
    });
} else {
    http.createServer(app).listen(app.get('port'), function () {
        logger.info('Express server listening on port ' + app.get('port') + ('development' == env ? ' - in development mode!' : ''));
    });
}



