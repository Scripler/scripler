var frontpage = require('./frontpage')
    , user = require('./user')
    , project = require('./project')
    , folder = require('./folder')
    , document = require('./document')
    , Project = require('../models/project.js').Project
    , Document = require('../models/document.js').Document
    , utils = require('../lib/utils');

module.exports = function (app, auth) {
    // Dummy GUI URLs
    app.get('/', frontpage.index);
    app.get('/account', frontpage.account);
    app.get('/login', frontpage.login);
    app.post('/login', frontpage.loginPost);
    app.get('/logout', frontpage.logout);
    app.get('/new-user', frontpage.newUser);
    app.post('/new-user', frontpage.newUserPost);

    // API URIs
    // The routes below are the URLs used by the API (not the URLs seen by the user).

    /* API Frontpage */
    app.get('/user', auth.isLoggedIn(), user.get);
    app.put('/user', auth.isLoggedIn(), user.edit);
    app.get('/user/list', auth.isLoggedIn(), user.list);
    app.post('/user/login', user.login);
    app.post('/user/logout', user.logout);
    app.post('/user/register', user.register);
    app.get('/user/:id/verify/:hash', user.verify);

    /* API Projectspace (projects) */
    app.get('/project/list', auth.isLoggedIn(), project.list);
    app.get('/project/archived', auth.isLoggedIn(), project.archived);
    app.put('/project/rearrange', auth.isLoggedIn(), project.rearrange);
    app.post('/project', auth.isLoggedIn(), project.create);
    app.get('/project/:projectIdPopulated', auth.isLoggedIn(), project.open);
    app.put('/project/:projectId/rename', auth.isLoggedIn(), project.rename);
    app.put('/project/:projectId/archive', auth.isLoggedIn(), project.archive);
    app.put('/project/:projectId/unarchive', auth.isLoggedIn(), project.unarchive);
    app.delete('/project/:projectId', auth.isLoggedIn(), project.delete);
    app.post('/project/:projectIdPopulated/copy', auth.isLoggedIn(), project.copy);

    /* API Projectmanager (documents and folders) */
    app.post('/document', auth.isLoggedIn(), project.load(), document.create);
    app.get('/document/:documentId', auth.isLoggedIn(), document.open);
    app.put('/document/:documentId/update', auth.isLoggedIn(), document.update);
    app.put('/document/:documentId/rename', auth.isLoggedIn(), document.rename);
    app.put('/document/:documentId/archive', auth.isLoggedIn(), document.archive);
    app.put('/document/:documentId/unarchive', auth.isLoggedIn(), document.unarchive);
    app.put('/document/:projectId/rearrange', auth.isLoggedIn(), document.rearrange);
    app.delete('/document/:projectId/:documentId', auth.isLoggedIn(), document.delete);

    app.post('/folder', auth.isLoggedIn(), project.load(), folder.create);
    app.get('/folder/:projectId/:folderId/:archived?', auth.isLoggedIn(), folder.open);
    app.put('/folder/:id/rename', auth.isLoggedIn(), project.load(), folder.rename);
    app.put('/folder/:projectId/:folderId/archive', auth.isLoggedIn(), folder.archive);
    app.put('/folder/:projectId/:folderId/unarchive', auth.isLoggedIn(), folder.unarchive);
    app.delete('/folder/:projectId/:parentFolderId/:folderId', auth.isLoggedIn(), folder.delete);


    // API Parameters
    app.param('projectId', function(req, res, next, id){
        return project.load(id)(req, res, next);
    });
    app.param('projectIdPopulated', function(req, res, next, id){
        return project.loadPopulated(id)(req, res, next);
    });
    app.param('documentId', function(req, res, next, id){
        return document.load(id)(req, res, next);
    });
}
