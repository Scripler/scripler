var express = require('express')
    , index = require('./routes/index')
    , user = require('./routes/user')
    , http = require('http')
    , path = require('path')
    , mongoose = require('mongoose')
    , conf = require('config')
    , passport = require('passport')
    , scriplerPassport = require('./routes/passport');

var app = express();

// db connect
mongoose.connect(conf.db.uri);

// all environments
app.set('port', conf.app.port);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs-locals'));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser(conf.app.cookie_secret));
app.use(express.session({ secret: conf.app.session_secret }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

/*Dummy GUI*/
//app.get('/', index.index);
//app.get('/account', index.account);
//app.get('/login', index.login);
//app.post('/login', user.login);
//app.get('/new-user', index.newUser);
//app.post('/new-user', index.newUserPost);

/*API*/
app.get('/users', user.list);
app.post('/user/login', user.login);
app.post('/user/logout', user.logout);
app.post('/user/register', user.register);

scriplerPassport.initPaths(app);

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port') + ('development' == app.get('env') ? ' -  in development mode!' : ''));
});
