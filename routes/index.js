var frontpage = require('./frontpage')
	, user = require('./user')
	, project = require('./project')
	, folder = require('./folder')
	, document = require('./document')
	, styleset = require('./styleset')
	, style = require('./style')
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

	/* API Project Space: Project */
	app.get('/project/list', auth.isLoggedIn(), project.list);
	app.put('/project/rearrange', auth.isLoggedIn(), project.rearrange);
	app.post('/project', auth.isLoggedIn(), project.create);
	app.get('/project/:projectIdPopulated', auth.isLoggedIn(), project.open);
	app.put('/project/:projectId/rename', auth.isLoggedIn(), project.rename);
	app.put('/project/:projectId/archive', auth.isLoggedIn(), project.archive);
	app.put('/project/:projectId/unarchive', auth.isLoggedIn(), project.unarchive);
	app.put('/project/:projectId/metadata', auth.isLoggedIn(), project.metadata);
	app.put('/project/:projectId/toc', auth.isLoggedIn(), project.toc);
	app.delete('/project/:projectId', auth.isLoggedIn(), project.delete);
	app.post('/project/:projectIdPopulatedFull/copy', auth.isLoggedIn(), project.copy);

	/* API Document Manager: Document and Folder */
	app.post('/document', auth.isLoggedIn(), project.load(), document.create);
	app.get('/document/:documentId', auth.isLoggedIn(), document.open);
	app.put('/document/:documentId/update', auth.isLoggedIn(), document.update);
	app.put('/document/:documentId/rename', auth.isLoggedIn(), document.rename);
	app.put('/document/:documentId/archive', auth.isLoggedIn(), document.archive);
	app.put('/document/:documentId/unarchive', auth.isLoggedIn(), document.unarchive);
	app.put('/document/:projectId/rearrange', auth.isLoggedIn(), document.rearrange);
	app.delete('/document/:projectId/:documentId', auth.isLoggedIn(), document.delete);
	app.post('/document/:projectId/upload', auth.isLoggedIn(), document.upload);
	app.post('/folder', auth.isLoggedIn(), project.load(), folder.create);
	app.get('/folder/:projectId/:folderId/:archived?', auth.isLoggedIn(), folder.open);
	app.put('/folder/:id/rename', auth.isLoggedIn(), project.load(), folder.rename);
	app.put('/folder/:projectId/:folderId/archive', auth.isLoggedIn(), folder.archive);
	app.put('/folder/:projectId/:folderId/unarchive', auth.isLoggedIn(), folder.unarchive);
	app.delete('/folder/:projectId/:parentFolderId?/:folderId', auth.isLoggedIn(), folder.delete);

	/* API Typography: Styleset and Style */
	app.get('/styleset/list', auth.isLoggedIn(), styleset.list);
	app.post('/styleset', auth.isLoggedIn(), styleset.create);
	app.get('/styleset/archived', auth.isLoggedIn(), styleset.archived); // This path must come before paths with variables
	app.get('/style/archived', auth.isLoggedIn(), style.archived); // This path must come before paths with variables
	app.get('/styleset/:stylesetId', auth.isLoggedIn(), styleset.open);
	app.post('/style', auth.isLoggedIn(), styleset.load(), style.create);
	app.get('/style/:styleId', auth.isLoggedIn(), style.open);
	app.put('/styleset/:stylesetIdPopulated/update', auth.isLoggedIn(), styleset.update);
	app.put('/style/:styleIdPopulated/update', auth.isLoggedIn(), style.update);
	app.put('/styleset/rearrange', auth.isLoggedIn(), styleset.rearrange);
	app.put('/styleset/:stylesetId/archive', auth.isLoggedIn(), styleset.archive);
	app.put('/styleset/:stylesetId/unarchive', auth.isLoggedIn(), styleset.unarchive);
	app.put('/style/:styleId/archive', auth.isLoggedIn(), style.archive);
	app.put('/style/:styleId/unarchive', auth.isLoggedIn(), style.unarchive);
	app.put('/styleset/:stylesetId/project/:projectId', auth.isLoggedIn(), project.applyStyleset);
	app.put('/styleset/:stylesetId/document/:documentId', auth.isLoggedIn(), document.applyStyleset);
	app.get('/document/:documentIdPopulatedStylesets/stylesets', auth.isLoggedIn(), document.listStylesets);

	/* API Output */
	app.get('/project/:projectIdPopulatedFull/compile', auth.isLoggedIn(), project.compile);

	// API Parameters
	app.param('projectId', function (req, res, next, id) {
		return project.load(id)(req, res, next);
	});
	app.param('projectIdPopulated', function (req, res, next, id) {
		return project.loadPopulated(id)(req, res, next);
	});
	app.param('projectIdPopulatedFull', function (req, res, next, id) {
		return project.loadPopulatedFull(id)(req, res, next);
	});
	app.param('documentId', function (req, res, next, id) {
		return document.load(id)(req, res, next);
	});
	app.param('documentIdPopulatedStylesets', function (req, res, next, id) {
		return document.loadPopulated(id)(req, res, next);
	});
	app.param('stylesetId', function (req, res, next, id) {
		return styleset.load(id)(req, res, next);
	});
	app.param('stylesetIdPopulated', function (req, res, next, id) {
		return styleset.loadPopulated(id)(req, res, next);
	});
	app.param('styleId', function (req, res, next, id) {
		return style.load(id)(req, res, next);
	});
	app.param('styleIdPopulated', function (req, res, next, id) {
		return style.loadPopulated(id)(req, res, next);
	});
}
