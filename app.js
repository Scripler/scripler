var express = require('express')
    , index = require('./routes/index')
    , user = require('./routes/user')
    , project = require('./routes/project')
    , folder = require('./routes/folder')
    , document = require('./routes/document')
    , http = require('http')
    , path = require('path')
    , mongoose = require('mongoose')
    , conf = require('config')
    , passport = require('passport')
    , auth = require('./lib/auth')
    , MongoStore = require('connect-mongo')(express)
    , logger = require('./lib/logger');

var app = express();
var env = app.get('env');

// db connect
mongoose.connect(conf.db.uri);

// all environments
app.set('port', conf.app.port);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs-locals'));
app.use(express.logger({format: 'short', stream: {write: function(msg){logger.info(msg.trim());}}}));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser(conf.app.cookie_secret));
app.use(express.session({
    secret: conf.app.session_secret,
    maxAge: new Date(Date.now() + 3600000),
    store:  new MongoStore({db: mongoose.connection.db})
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == env) {
    app.use(express.errorHandler());
}

// -------------------------- API --------------------------

// The routes below are the URLs used by the API (not the URLs seen by the user).

/*Dummy GUI*/
app.get('/', index.index);
app.get('/account', index.account);
app.get('/login', index.login);
app.post('/login', index.loginPost);
app.get('/logout', index.logout)
app.get('/new-user', index.newUser);
app.post('/new-user', index.newUserPost);

/* API Frontpage */
app.get('/user', auth.isLoggedIn(), user.get);
app.put('/user', auth.isLoggedIn(), user.edit);
app.get('/user/list', auth.isLoggedIn(), user.list);
app.post('/user/login', user.login);
app.post('/user/logout', user.logout);
app.post('/user/register', user.register);
app.get('/user/:id/validate/:hash', user.validate);

/* API Projectspace (projects) */
app.get('/project/list', auth.isLoggedIn(), project.list);
app.get('/project/archived', auth.isLoggedIn(), project.archived);
app.put('/project/rearrange', auth.isLoggedIn(), project.rearrange);
app.post('/project', auth.isLoggedIn(), project.create);
app.get('/project/:id', auth.isLoggedIn(), project.open);
app.put('/project/:id/rename', auth.isLoggedIn(), project.rename);
app.put('/project/:id/archive', auth.isLoggedIn(), project.archive);
app.put('/project/:id/unarchive', auth.isLoggedIn(), project.unarchive);
app.delete('/project/:id', auth.isLoggedIn(), project.delete);
app.post('/project/:id/copy', auth.isLoggedIn(), project.copy);

/* API Projectmanager (documents and folders) */
app.post('/document', auth.isLoggedIn(), document.create);
app.get('/document/:id', auth.isLoggedIn(), document.open);
app.put('/document/:id/rename', auth.isLoggedIn(), document.rename);
app.put('/document/:id/archive', auth.isLoggedIn(), document.archive);
app.put('/document/:id/unarchive', auth.isLoggedIn(), document.unarchive);
app.delete('/document/:projectId/:documentId', auth.isLoggedIn(), document.delete);

app.post('/folder', auth.isLoggedIn(), folder.create);
app.get('/folder/:projectId/:folderId', auth.isLoggedIn(), folder.open);
app.put('/folder/:id/rename', auth.isLoggedIn(), folder.rename);
app.put('/folder/:projectId/:folderId/archive', auth.isLoggedIn(), folder.archive);
app.put('/folder/:projectId/:folderId/unarchive', auth.isLoggedIn(), folder.unarchive);
app.delete('/folder/:projectId/:parentFolderId/:folderId', auth.isLoggedIn(), folder.delete);

//-------------------------- API END --------------------------


auth.initPaths(app);

http.createServer(app).listen(app.get('port'), function () {
    logger.info('Express server listening on port ' + app.get('port') + ('development' == env ? ' - in development mode!' : ''));
});

