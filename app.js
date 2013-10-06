var express = require('express')
    , http = require('http')
    , fs = require('fs')
    , mongoose = require('mongoose')
    , conf = require('config')
    , auth = require('./lib/auth')
    , logger = require('./lib/logger');

var app = express();

// db connect
mongoose.connect(conf.db.uri);

require('./config/express')(app, conf, mongoose);
require('./routes')(app, auth);
auth.initPaths(app);

http.createServer(app).listen(app.get('port'), function () {
    logger.info('Express server listening on port ' + app.get('port') + ('development' == app.get('env') ? ' - in development mode!' : ''));
});
