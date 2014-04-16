process.env.NODE_ENV = 'test';

var assert = require("assert")
	, conf = require('config')
	, app = require('../app')
	, mongoose = require('mongoose')
	, request = require('supertest')
	, fs = require('fs')
	, path = require('path')
	, moment = require('moment');

var exec = require('child_process').exec,
	child;

var host = '127.0.0.1:' + conf.app.port;
var cookie;
var systemStylesetId;
var systemStyleId;
var projectId;
var projectId2;
var projectId3;
var projectId4;
var projectId5;
var userId;
var rootFolderId;
var childFolderId;
var rootDocumentId;
var childDocumentId;
var coverDocumentId;
var titlePageDocumentId;
var tocDocumentId;
var colophonDocumentId;
var stylesetId;
var stylesetId2;
var stylesetId3;
var styleId;
var styleId2;
var stylesetDocumentId;
var stylesetCopiedId;
var styleCopiedId;

var cleanupEPUB = true;

function containsId(items, id) {
	var result = false;
	for (var i = 0; i < items.length; i++) {
		if (items[i]._id == id) {
			result = true;
			break;
		}
	}
	return result;
}

function containsDocWithFolderId(documents, folderId) {
	var result = false;
	for (var i = 0; i < documents.length; i++) {
		if (documents[i].folderId == folderId) {
			result = true;
			break;
		}
	}
	return result;
}

if (conf.db.uri.match('_test$') === null) {
	console.log("You shouldn't be running this test on any database not being specifically meant for 'test'!");
	console.log("You tried with this database: " + conf.db.uri);
	process.exit(1);
}

/*

 NB! When creating or changing tests that ADD documents, be sure to include ALL document ids in the REARRANGE DOCUMENTS test
 since this test will currently overwrite all previously set document ids which will probably cause unexpected behaviour
 in any test following the rearrange test.

 See: https://github.com/Scripler/scripler/issues/14

 */

describe('Scripler RESTful API', function () {
	before(function (done) {
		//Don't start the tests before the database connection is ready.
		mongoose.connection.on('open', function () {
			mongoose.connection.db.dropDatabase(function () {
				done();
			});
		});
	}),
	describe('Frontpage (/user) - initialization', function () {
		it('Register a new user should return the user (dummy initialization)', function (done) {
			request(host)
				.post('/user/register')
				.send({name: "Dummy Doe", email: "dummy@doe.com", password: "12345678"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.user.firstname, "Dummy");
					assert.equal(res.body.user.lastname, "Doe");
					done();
				});
		}),
		it('Login the dummy user to be able to create system stylesets and styles.', function (done) {
			request(host)
				.post('/user/login')
				.send({email: "dummy@doe.com", password: "12345678"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					cookie = res.headers['set-cookie'];
					assert.equal(res.body.user.firstname, "Dummy");
					assert.equal(res.body.user.lastname, "Doe");
					done();
				});
		})
	}),
	describe('Add system/Scripler stylesets and styles', function () {
		it('Creating a system styleset should return the new styleset', function (done) {
			request(host)
				.post('/styleset')
				.set('cookie', cookie)
				.send({name: "Scripler Styleset 1", isSystem: "true"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.name, "Scripler Styleset 1");
					assert.equal(res.body.styleset.isSystem, true);
					systemStylesetId = res.body.styleset._id;
					systemStylesetId && done();
				});
		}),
		it('Creating a system style should return the new style', function (done) {
			request(host)
				.post('/style')
				.set('cookie', cookie)
				.send({stylesetId: systemStylesetId, name: "Scripler Style 1", class: "ScruplerZ", css: "some scripler css", isSystem: "true"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style.name, "Scripler Style 1");
					assert.equal(res.body.style.class, "ScruplerZ");
					assert.equal(res.body.style.css, "some scripler css");
					assert.equal(res.body.style.isSystem, true);
					assert.equal(res.body.style.stylesetId, systemStylesetId);
					styleId = res.body.style._id;
					styleId && done();
				});
		})
	}),
	describe('Frontpage (/user)', function () {
		it('Registering a new user should return the user', function (done) {
			request(host)
				.post('/user/register')
				.send({name: "John Doe", email: "john@doe.com", password: "12345678"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.user.firstname, "John");
					assert.equal(res.body.user.lastname, "Doe");
					assert.notEqual(res.body.user.stylesets[0], systemStylesetId); // Stylesets are copied
					assert.notEqual(res.body.user.defaultStyleset, systemStylesetId);
					done();
				});
		}),
		it('Login should return current user', function (done) {
			request(host)
				.post('/user/login')
				.send({email: "john@doe.com", password: "12345678"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					cookie = res.headers['set-cookie'];
					assert.equal(res.body.user.firstname, "John");
					assert.equal(res.body.user.lastname, "Doe");
					userId = res.body.user._id;
					done();
				});
		}),
		it('Get current user', function (done) {
			request(host)
				.get('/user')
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.user.firstname, "John");
					assert.equal(res.body.user.lastname, "Doe");
					done();
				});
		}),
		it('Update current users profile name', function (done) {
			request(host)
				.put('/user')
				.set('cookie', cookie)
				.send({firstname: "John", lastname: "Doe, Jr."})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.user.firstname, "John");
					assert.equal(res.body.user.lastname, "Doe, Jr.");
					done();
				});
		}),
		it('Update current users profile with invalid email shold return error', function (done) {
			request(host)
				.put('/user')
				.set('cookie', cookie)
				.send({email: "allan-scripler.com"})
				.expect(400)
				.end(function (err, res) {
					if (err) throw new Error(err);
					assert.equal(res.body.errorMessage, "Invalid email address");
					done();
				});
		}),
		it('Invalid login password should return error', function (done) {
			request(host)
				.post('/user/login')
				.send({email: "john@doe.com", password: "xxx"})
				.expect(401)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.errorMessage, "Invalid password");
					done();
				});
		}),
		it('Invalid login email should return error', function (done) {
			request(host)
				.post('/user/login')
				.send({email: "someone@doe.com", password: "abc"})
				.expect(401)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.errorMessage, "Unknown user someone@doe.com");
					done();
				});
		})
	}),
	describe('Projectspace (/project)', function () {
		it('Creating a project should return the new project - 1', function (done) {
			request(host)
				.post('/project')
				.set('cookie', cookie)
				.send({name: "The Wizard of Oz"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.name, "The Wizard of Oz");
					assert.equal(res.body.project.archived, false);
					assert.equal(res.body.project.members[0].userId, userId);
					assert.equal(res.body.project.members[0].access[0], "admin");
					projectId = res.body.project._id;
					done();
				});
		}),
		it('Creating a project should return the new project - 2', function (done) {
			request(host)
				.post('/project')
				.set('cookie', cookie)
				.send({name: "A Nice Story"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.name, "A Nice Story");
					projectId2 = res.body.project._id;
					done();
				});
		}),
		it('Project list without session should return unauthorized', function (done) {
			request(host)
				.get('/project/list')
				.expect(401)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.errorMessage, "User not authenticated");
					done();
				});
		}),
		it('Opening a project should return the project', function (done) {
			request(host)
				.get('/project/' + projectId)
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.name, "The Wizard of Oz");
					done();
				});
		}),
		it('Copying a project should return the new project', function (done) {
			request(host)
				.post('/project/' + projectId + '/copy')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.name, "The Wizard of Oz - Copy");
					assert.equal(res.body.project.archived, false);
					assert.notEqual(res.body.project._id, projectId);
					projectId3 = res.body.project._id;
					done();
				});
		}),
		it('Renaming a project should return the project', function (done) {
			request(host)
				.put('/project/' + projectId3 + '/rename')
				.set('cookie', cookie)
				.send({name: "A New Name"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.name, "A New Name");
					done();
				});
		}),
		it('Archiving a project should return the archived project', function (done) {
			request(host)
				.put('/project/' + projectId3 + '/archive')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.name, "A New Name");
					assert.equal(res.body.project.archived, true);
					done();
				});
		}),
		it('Project list should return all projects in creation order: BOTH unarchived AND archived', function (done) {
			request(host)
				.get('/project/list')
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.projects.length, 3);
					assert.equal(res.body.projects[0].name, "The Wizard of Oz");
					assert.equal(res.body.projects[0]._id, projectId);
					assert.equal(res.body.projects[1].name, "A Nice Story");
					assert.equal(res.body.projects[1]._id, projectId2);
					assert.equal(res.body.projects[2].name, "A New Name");
					assert.equal(res.body.projects[2]._id, projectId3);
					done();
				});
		}),
		it('Attempting to rearrange e.g. fewer projects than the user has should return an error', function (done) {
			request(host)
				.put('/project/rearrange')
				.set('cookie', cookie)
				.send({projects: [projectId2, projectId]})
				.expect(400)
				.end(function (err, res) {
					if (err) throw new Error(err);
					assert.equal(res.body.errorMessage, "/project/rearrange can only rearrange existing projects (not e.g. add or delete projects)");
					done();
				});
		}),
		it('Rearranging projects should return project list in the new order ', function (done) {
			request(host)
				.put('/project/rearrange')
				.set('cookie', cookie)
				.send({projects: [projectId2, projectId, projectId3]})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.projects.length, 3);
					assert.equal(res.body.projects[0].name, "A Nice Story");
					assert.equal(res.body.projects[1].name, "The Wizard of Oz");
					assert.equal(res.body.projects[2].name, "A New Name");
					done();
				});
		}),
		it('Unarchiving a project should return the unarchived project', function (done) {
			request(host)
				.put('/project/' + projectId3 + '/unarchive')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.name, "A New Name");
					assert.equal(res.body.project.archived, false);
					done();
				});
		}),
		it('Project list should (still) return all projects in order: the three unarchived projects', function (done) {
			request(host)
				.get('/project/list')
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.projects.length, 3);
					assert.equal(res.body.projects[0].name, "A Nice Story");
					assert.equal(res.body.projects[1].name, "The Wizard of Oz");
					assert.equal(res.body.projects[2].name, "A New Name");
					done();
				});
		}),
		it('Deleting a project should return success', function (done) {
			request(host)
				.del('/project/' + projectId3)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Get current user should return the user with only the two projectIds', function (done) {
			request(host)
				.get('/user')
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.user.projects.length, 2);
					assert.equal(res.body.user.projects[0], projectId2);
					assert.equal(res.body.user.projects[1], projectId);
					done();
				});
		})
	}),
	describe('Initialize Typography (Project.applyStyleset() (such that EPUB will contain styles))', function () {
		var css = '.container > header nav a:after {' +
			'content: attr(data-info);' +
			'color: #47a3da;' +
			'position: absolute;' +
			'width: 600%;' +
			'top: 120%;' +
			'text-align: right;' +
			'right: 0;' +
			'opacity: 0;' +
			'pointer-events: none;' +
			'}' +

			'.container > header nav a:hover:after {' +
			'	opacity: 1;' +
			'}' +

			'.container > header nav a:hover {' +
			'	background: #47a3da;' +
			'}';

		it('Creating a styleset should return the new styleset', function (done) {
			request(host)
				.post('/styleset')
				.set('cookie', cookie)
				.send({name: "My Best Styleset"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.name, "My Best Styleset");
					stylesetId = res.body.styleset._id;
					stylesetId && done();
				});
		}),
		it('Creating a style should return the new style', function (done) {
			request(host)
				.post('/style')
				.set('cookie', cookie)
				.send({stylesetId: stylesetId, name: "Coolio", class: "CoolioClass", css: css})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style.name, "Coolio");
					assert.equal(res.body.style.class, "CoolioClass");
					assert.equal(res.body.style.css, css);
					assert.equal(res.body.style.stylesetId, stylesetId);
					styleId = res.body.style._id;
					styleId && done();
				});
		}),
		it('Applying a styleset to a project should return the project with a COPY of the styleset applied', function (done) {
			request(host)
				.put('/styleset/' + stylesetId + "/project/" + projectId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project._id, projectId);
					assert.notEqual(res.body.project.styleset, stylesetId);
					done();
				});
		})
	}),
	describe('Document Manager (Document & Folder)', function () {
		it('Creating a folder without a parent should return the new folder as an empty root folder', function (done) {
			request(host)
				.post('/folder')
				.set('cookie', cookie)
				.send({projectId: projectId, name: 'Chapter 1'})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.folder.name, 'Chapter 1');
					assert.equal(res.body.folder.folders.length, 0);
					rootFolderId = res.body.folder._id;
					rootFolderId && done();
				});
		}),
			it('Opening the root folder should return an empty folder', function (done) {
				request(host)
					.get('/folder/' + projectId + '/' + rootFolderId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.result.folders.length, 0);
						assert.equal(res.body.result.docs.length, 0);
						done();
					});
			}),
			it('Creating a folder with a parent folder should return the new folder as an empty child folder of the parent', function (done) {
				request(host)
					.post('/folder')
					.set('cookie', cookie)
					.send({projectId: projectId, name: 'Chapter 1 - images', parentFolderId: rootFolderId})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.folder.name, 'Chapter 1 - images');
						assert.equal(res.body.folder.folders.length, 0);
						childFolderId = res.body.folder._id;
						childFolderId && done();
					});
			}),
			it('Opening the child folder should return an empty folder', function (done) {
				request(host)
					.get('/folder/' + projectId + '/' + childFolderId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.result.folders.length, 0);
						assert.equal(res.body.result.docs.length, 0);
						done();
					});
			}),
			it('Renaming a folder should return the folder', function (done) {
				request(host)
					.put('/folder/' + rootFolderId + '/rename')
					.set('cookie', cookie)
					.send({projectId: projectId, name: "A New Fine Name"})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.folder.name, "A New Fine Name");
						done();
					});
			}),
			it('Creating a document in a folder (the root folder) should return the document with that folder id - 1', function (done) {
				var text = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
					'<!DOCTYPE html>' +
					'<html xmlns="http://www.w3.org/1999/xhtml">' +
					'<head><title>MyFirstDocument</title></head>' +
					'<body><p>It is my best document ever!</p></body>' +
					'</html>';

				request(host)
					.post('/document')
					.set('cookie', cookie)
					.send({
						projectId: projectId,
						folderId: rootFolderId,
						name: 'MyFirstDocument',
						text: text
					})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						document = res.body.document;
						assert.equal(res.body.document.name, 'MyFirstDocument');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, rootFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.notEqual(res.body.document.stylesets[0], stylesetId); // Stylesets are copied
						assert.notEqual(res.body.document.defaultStyleset, stylesetId);
						rootDocumentId = res.body.document._id;
						rootDocumentId && done();
					});
			}),
			it('Creating a document in a folder (the child folder) should return the document with that folder id - 2', function (done) {
				var text = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
					'<!DOCTYPE html>' +
					'<html xmlns="http://www.w3.org/1999/xhtml">' +
					'<head><title>MySecondDocument</title></head>' +
					'<body><p>It is almost my best document!</p></body>' +
					'</html>';

				request(host)
					.post('/document')
					.set('cookie', cookie)
					.send({projectId: projectId, folderId: childFolderId, name: 'MySecondDocument', text: text})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						document = res.body.document;
						assert.equal(res.body.document.name, 'MySecondDocument');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, childFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.notEqual(res.body.document.stylesets[0], stylesetId); // Stylesets are copied
						assert.notEqual(res.body.document.defaultStyleset, stylesetId);
						childDocumentId = res.body.document._id;
						childDocumentId && done();
					});
			}),
			it('Creating a cover document should return the document with type = "cover"', function (done) {
				var text = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
					'<!DOCTYPE html>' +
					'<html xmlns="http://www.w3.org/1999/xhtml">' +
					'<head><title>Cover</title></head>' +
					'<body><p>Cool Cover</p></body>' +
					'</html>';

				request(host)
					.post('/document')
					.set('cookie', cookie)
					.send({
						projectId: projectId,
						folderId: rootFolderId,
						name: 'Cover',
						text: text,
						type: 'cover'
					})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						document = res.body.document;
						assert.equal(res.body.document.name, 'Cover');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, rootFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.equal(res.body.document.type, 'cover');
						assert.notEqual(res.body.document.stylesets[0], stylesetId); // Stylesets are copied
						assert.notEqual(res.body.document.defaultStyleset, stylesetId);
						coverDocumentId = res.body.document._id;
						coverDocumentId && done();
					});
			}),
			it('Creating a title page document should return the document with type = "titlepage"', function (done) {
				var text = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
					'<!DOCTYPE html>' +
					'<html xmlns="http://www.w3.org/1999/xhtml">' +
					'<head><title>TitlePage</title></head>' +
					'<body><p>Cool TitlePage</p></body>' +
					'</html>';

				request(host)
					.post('/document')
					.set('cookie', cookie)
					.send({
						projectId: projectId,
						folderId: rootFolderId,
						name: 'TitlePage',
						text: text,
						type: 'titlepage'
					})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						document = res.body.document;
						assert.equal(res.body.document.name, 'TitlePage');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, rootFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.equal(res.body.document.type, 'titlepage');
						assert.notEqual(res.body.document.stylesets[0], stylesetId); // Stylesets are copied
						assert.notEqual(res.body.document.defaultStyleset, stylesetId);
						titlePageDocumentId = res.body.document._id;
						titlePageDocumentId && done();
					});
			}),
			it('Creating a table of contents document should return the document with type = "toc"', function (done) {
				var text = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
					'<!DOCTYPE html>' +
					'<html xmlns="http://www.w3.org/1999/xhtml">' +
					'<head><title>ToC</title></head>' +
					'<body><p>Cool ToC</p></body>' +
					'</html>';

				request(host)
					.post('/document')
					.set('cookie', cookie)
					.send({
						projectId: projectId,
						folderId: rootFolderId,
						name: 'ToC',
						text: text,
						type: 'toc'
					})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						document = res.body.document;
						assert.equal(res.body.document.name, 'ToC');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, rootFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.equal(res.body.document.type, 'toc');
						assert.notEqual(res.body.document.stylesets[0], stylesetId); // Stylesets are copied
						assert.notEqual(res.body.document.defaultStyleset, stylesetId);
						tocDocumentId = res.body.document._id;
						tocDocumentId && done();
					});
			}),
			it('Creating a colophon document should return the document with type = "colophon"', function (done) {
				var text = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
					'<!DOCTYPE html>' +
					'<html xmlns="http://www.w3.org/1999/xhtml">' +
					'<head><title>Colophon</title></head>' +
					'<body><p>Cool Colophon</p></body>' +
					'</html>';

				request(host)
					.post('/document')
					.set('cookie', cookie)
					.send({
						projectId: projectId,
						folderId: rootFolderId,
						name: 'Colophon',
						text: text,
						type: 'colophon'
					})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						document = res.body.document;
						assert.equal(res.body.document.name, 'Colophon');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, rootFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.equal(res.body.document.type, 'colophon');
						assert.notEqual(res.body.document.stylesets[0], stylesetId); // Stylesets are copied
						assert.notEqual(res.body.document.defaultStyleset, stylesetId);
						colophonDocumentId = res.body.document._id;
						colophonDocumentId && done();
					});
			}),
			it('Opening the project should now return the root and child documents and the Cover, TitlePage, ToC and Colophon documents.', function (done) {
				request(host)
					.get('/project/' + projectId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.project.documents.length, 6);
						assert.equal(res.body.project.documents[0]._id, rootDocumentId);
						assert.equal(res.body.project.documents[1]._id, childDocumentId);
						assert.equal(res.body.project.documents[2]._id, coverDocumentId);
						assert.equal(res.body.project.documents[3]._id, titlePageDocumentId);
						assert.equal(res.body.project.documents[4]._id, tocDocumentId);
						assert.equal(res.body.project.documents[5]._id, colophonDocumentId);
						done();
					});
			}),
			it('Updating a document should return success', function (done) {
				var text = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
					'<!DOCTYPE html>' +
					'<html xmlns="http://www.w3.org/1999/xhtml">' +
					'<head><title>MyFirstDocument</title></head>' +
					'<body><p>This is no longer a matter of if but when...and look here...</p></body>' +
					'</html>';

				request(host)
					.put('/document/' + rootDocumentId + '/update')
					.set('cookie', cookie)
					.send({text: text})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						done();
					});
			}),
			it('Opening a document (the root document) should return the document', function (done) {
				request(host)
					.get('/document/' + rootDocumentId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.document.name, 'MyFirstDocument');
						done();
					});
			}),
			it('Renaming a document (the root document) should return the document', function (done) {
				request(host)
					.put('/document/' + rootDocumentId + '/rename')
					.set('cookie', cookie)
					.send({name: "A New Cool Name"})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.document.name, "A New Cool Name");
						done();
					});
			}),
			it('Opening the root folder should return the folder contents: the child folder, the root document and the "guide" documents (e.g. Cover)', function (done) {
				request(host)
					.get('/folder/' + projectId + '/' + rootFolderId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.result.folders.length, 1);
						assert.equal(res.body.result.folders[0]._id, childFolderId);
						assert.equal(res.body.result.docs.length, 5);
						assert.equal(containsDocWithFolderId(res.body.result.docs, rootFolderId), true);
						assert.equal(containsId(res.body.result.docs, rootDocumentId), true);
						assert.equal(containsId(res.body.result.docs, coverDocumentId), true);
						done();
					});
			}),
			it('Archiving a folder (the child folder) should return success', function (done) {
				request(host)
					.put('/folder/' + projectId + '/' + childFolderId + '/archive')
					.set('cookie', cookie)
					.send({})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						done();
					});
			}),
			it('Opening the root folder should now only return the root document and the "guide" documents (e.g. Cover), since we just archived the child folder', function (done) {
				request(host)
					.get('/folder/' + projectId + '/' + rootFolderId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.result.folders.length, 0);
						assert.equal(res.body.result.docs.length, 5);
						assert.equal(containsDocWithFolderId(res.body.result.docs, rootFolderId), true);
						assert.equal(containsId(res.body.result.docs, rootDocumentId), true);
						assert.equal(containsId(res.body.result.docs, coverDocumentId), true);
						done();
					});
			}),
			it('Opening the special "archive" (trash) folder should return the child folder and child document', function (done) {
				request(host)
					.get('/folder/' + projectId + '/' + rootFolderId + '/' + true)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.result.folders.length, 1);
						assert.equal(res.body.result.docs.length, 1);
						assert.equal(res.body.result.docs[0].folderId, childFolderId);
						assert.equal(res.body.result.docs[0]._id, childDocumentId);
						done();
					});
			}),
			it('Unarchiving a folder (the child folder) should return the unarchived folder', function (done) {
				request(host)
					.put('/folder/' + projectId + '/' + childFolderId + '/unarchive')
					.set('cookie', cookie)
					.send({})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.folder.archived, false);
						done();
					});
			}),
			it('Opening the special "archive" (trash) folder should now return no folders or documents, since we just unarchived the child folder', function (done) {
				request(host)
					.get('/folder/' + projectId + '/' + rootFolderId + '/' + true)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.result.folders.length, 0);
						assert.equal(res.body.result.docs.length, 0);
						done();
					});
			}),
			it('Opening the root folder should now again return the child folder, the root document and the "guide" documents (e.g. Cover)', function (done) {
				request(host)
					.get('/folder/' + projectId + '/' + rootFolderId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.result.folders.length, 1);
						assert.equal(containsId(res.body.result.folders, childFolderId), true);

						assert.equal(res.body.result.docs.length, 5);
						assert.equal(containsDocWithFolderId(res.body.result.docs, rootFolderId), true);
						assert.equal(containsId(res.body.result.docs, rootDocumentId), true);
						assert.equal(containsId(res.body.result.docs, coverDocumentId), true);
						done();
					});
			}),
			it('Archiving a document (the root document) should return success', function (done) {
				request(host)
					.put('/document/' + rootDocumentId + '/archive')
					.set('cookie', cookie)
					.send({})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						done();
					});
			}),
			it('Opening the root folder should now only return the child folder and the "guide" documents (e.g. Cover), since we just archived the root document', function (done) {
				request(host)
					.get('/folder/' + projectId + '/' + rootFolderId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.result.folders.length, 1);
						assert.equal(res.body.result.folders[0]._id, childFolderId);
						assert.equal(res.body.result.docs.length, 4);
						assert.equal(res.body.result.docs[0]._id, coverDocumentId);
						done();
					});
			}),
			it('Unarchiving a document (the root document) should return the archived document', function (done) {
				request(host)
					.put('/document/' + rootDocumentId + '/unarchive')
					.set('cookie', cookie)
					.send({})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.document.archived, false);
						done();
					});
			}),
			it('Attempting to rearrange e.g. more documents than the project has should return an error', function (done) {
				request(host)
					.put('/document/' + projectId + '/rearrange')
					.set('cookie', cookie)
					.send({documents: [rootDocumentId, childDocumentId, rootDocumentId, coverDocumentId, titlePageDocumentId, tocDocumentId, colophonDocumentId]})
					.expect(400)
					.end(function (err, res) {
						if (err) throw new Error(err);
						assert.equal(res.body.errorMessage, "/document/rearrange can only rearrange existing documents (not e.g. add or delete documents)");
						done();
					});
			}),
			it('Rearranging documents should return the project with the documents in the new order ', function (done) {
				request(host)
					.put('/document/' + projectId + '/rearrange')
					.set('cookie', cookie)
					.send({documents: [childDocumentId, rootDocumentId, coverDocumentId, titlePageDocumentId, tocDocumentId, colophonDocumentId]})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.project.documents.length, 6);
						assert.equal(res.body.project.documents[0], childDocumentId);
						assert.equal(res.body.project.documents[1], rootDocumentId);
						assert.equal(res.body.project.documents[2], coverDocumentId);
						assert.equal(res.body.project.documents[3], titlePageDocumentId);
						assert.equal(res.body.project.documents[4], tocDocumentId);
						assert.equal(res.body.project.documents[5], colophonDocumentId);
						done();
					});
			}),
			it('Opening the project should return the six documents', function (done) {
				request(host)
					.get('/project/' + projectId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.project.folders.length, 1);
						assert.equal(res.body.project.folders[0]._id, rootFolderId);
						assert.equal(res.body.project.folders[0].folders.length, 1);
						assert.equal(res.body.project.folders[0].folders[0]._id, childFolderId);
						assert.equal(res.body.project.documents.length, 6);
						assert.equal(res.body.project.documents[0]._id, childDocumentId);
						assert.equal(res.body.project.documents[1]._id, rootDocumentId);
						assert.equal(res.body.project.documents[2]._id, coverDocumentId);
						assert.equal(res.body.project.documents[3]._id, titlePageDocumentId);
						assert.equal(res.body.project.documents[4]._id, tocDocumentId);
						assert.equal(res.body.project.documents[5]._id, colophonDocumentId);
						done();
					});
			}),
			it('Copying the project should return the copied project with the COPIED folders and documents', function (done) {
				request(host)
					.post('/project/' + projectId + '/copy')
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						projectId4 = res.body.project._id;
						assert.notEqual(projectId4, projectId);
						assert.equal(res.body.project.folders.length, 1);
						assert.equal(res.body.project.folders[0]._id, rootFolderId);
						assert.equal(res.body.project.folders[0].folders.length, 1);
						assert.equal(res.body.project.folders[0].folders[0]._id, childFolderId);
						assert.equal(res.body.project.documents.length, 6);
						assert.notEqual(res.body.project.documents[0], childDocumentId);
						assert.notEqual(res.body.project.documents[1], rootDocumentId);
						assert.notEqual(res.body.project.documents[2], coverDocumentId);
						assert.notEqual(res.body.project.documents[3], titlePageDocumentId);
						assert.notEqual(res.body.project.documents[4], tocDocumentId);
						assert.notEqual(res.body.project.documents[5], colophonDocumentId);
						done();
					});
			}),
			it('Project list should return the three unarchived projects in order - the last must be the new copy', function (done) {
				request(host)
					.get('/project/list')
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.projects.length, 3);
						assert.equal(res.body.projects[0].name, "A Nice Story");
						assert.equal(res.body.projects[1].name, "The Wizard of Oz");
						assert.equal(res.body.projects[2].name, "The Wizard of Oz - Copy");
						assert.notEqual(res.body.projects[1].documents[0], res.body.projects[2].documents[0]);
						assert.notEqual(res.body.projects[1].documents[1], res.body.projects[2].documents[1]);
						done();
					});
			}),
			it('Deleting a document (the root document) should return success', function (done) {
				request(host)
					.del('/document/' + projectId + '/' + rootDocumentId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						done();
					});
			}),
			it('Opening the project should now only return the root and child folders and five documents (not the document we just deleted)', function (done) {
				request(host)
					.get('/project/' + projectId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.project.folders.length, 1);
						assert.equal(res.body.project.folders[0]._id, rootFolderId);
						assert.equal(res.body.project.folders[0].folders.length, 1);
						assert.equal(res.body.project.folders[0].folders[0]._id, childFolderId);

						assert.equal(res.body.project.documents.length, 5);
						assert.equal(res.body.project.documents[0]._id, childDocumentId);
						assert.equal(res.body.project.documents[0].name, "MySecondDocument");
						assert.equal(res.body.project.documents[0].text, undefined);

						assert.equal(res.body.project.documents[1]._id, coverDocumentId);
						assert.equal(res.body.project.documents[1].name, "Cover");
						assert.equal(res.body.project.documents[1].text, undefined);
						assert.equal(res.body.project.documents[1].type, "cover");

						assert.equal(res.body.project.documents[2]._id, titlePageDocumentId);
						assert.equal(res.body.project.documents[2].name, "TitlePage");
						assert.equal(res.body.project.documents[2].text, undefined);
						assert.equal(res.body.project.documents[2].type, "titlepage");

						assert.equal(res.body.project.documents[3]._id, tocDocumentId);
						assert.equal(res.body.project.documents[3].name, "ToC");
						assert.equal(res.body.project.documents[3].text, undefined);
						assert.equal(res.body.project.documents[3].type, "toc");

						assert.equal(res.body.project.documents[4]._id, colophonDocumentId);
						assert.equal(res.body.project.documents[4].name, "Colophon");
						assert.equal(res.body.project.documents[4].text, undefined);
						assert.equal(res.body.project.documents[4].type, "colophon");

						done();
					});
			}),
			it('Deleting a folder (the child folder) should return success', function (done) {
				request(host)
					.del('/folder/' + projectId + '/' + rootFolderId + '/' + childFolderId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						done();
					});
			}),
			it('Opening the root folder should now return no folders and the "guide" documents (e.g. Cover), since we just deleted the child folder', function (done) {
				request(host)
					.get('/folder/' + projectId + '/' + rootFolderId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.result.folders.length, 0);
						assert.equal(res.body.result.docs.length, 4);
						assert.equal(res.body.result.docs[0]._id, coverDocumentId);
						assert.equal(res.body.result.docs[1]._id, titlePageDocumentId);
						assert.equal(res.body.result.docs[2]._id, tocDocumentId);
						assert.equal(res.body.result.docs[3]._id, colophonDocumentId);
						done();
					});
			}),
			it('Opening the project should now only return the root folder and the "guide" documents (e.g. Cover)', function (done) {
				request(host)
					.get('/project/' + projectId)
					.set('cookie', cookie)
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.project.folders.length, 1);
						assert.equal(res.body.project.folders[0]._id, rootFolderId);
						assert.equal(res.body.project.folders[0].folders.length, 0);
						assert.equal(res.body.project.documents.length, 4);
						assert.equal(res.body.project.documents[0]._id, coverDocumentId);
						assert.equal(res.body.project.documents[1]._id, titlePageDocumentId);
						assert.equal(res.body.project.documents[2]._id, tocDocumentId);
						assert.equal(res.body.project.documents[3]._id, colophonDocumentId);
						done();
					});
			}),
			it('Creating a document in a child folder, should return the document with that folder id', function (done) {
				var text = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
					'<!DOCTYPE html>' +
					'<html xmlns="http://www.w3.org/1999/xhtml">' +
					'<head><title>Sikke et dokument</title></head>' +
					'<body><p>It is another one of my worst documents ever!</p></body>' +
					'</html>';

				request(host)
					.post('/document')
					.set('cookie', cookie)
					.send({projectId: projectId, folderId: childFolderId, name: 'Sikke et dokument', text: text})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						document = res.body.document;
						assert.equal(res.body.document.name, 'Sikke et dokument');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, childFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						childDocumentId = res.body.document._id;
						childDocumentId && done();
					});
			})
	}),
	describe('Typography (Styleset & Style)', function () {
		var css2 = '.container > header nav a:after {' +
			'content: attr(data-info);' +
			'color: #47a3da;' +
			'position: absolute;' +
			'width: 600%;' +
			'top: 120%;' +
			'text-align: right;' +
			'right: 0;' +
			'opacity: 0;' +
			'pointer-events: none;' +
			'}' +

			'.container > header nav a:hover:after {' +
			'	opacity: 1;' +
			'}' +

			'.container > header nav a:hover {' +
			'	background: #47a3d2;' +
			'}';

		it('Creating a styleset should return the new styleset - 2', function (done) {
			request(host)
				.post('/styleset')
				.set('cookie', cookie)
				.send({name: "My Best Styleset 2"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.name, "My Best Styleset 2");
					stylesetId2 = res.body.styleset._id;
					stylesetId2 && done();
				});
		}),
		it('Creating a style should return the new style - 2', function (done) {
			request(host)
				.post('/style')
				.set('cookie', cookie)
				.send({stylesetId: stylesetId2, name: "Coolio 2", class: "CoolioClass2", css: css2})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style.name, "Coolio 2");
					assert.equal(res.body.style.class, "CoolioClass2");
					assert.equal(res.body.style.css, css2);
					styleId2 = res.body.style._id;
					assert.equal(res.body.style.stylesetId, stylesetId2);
					styleId2 && done();
				});
		}),
		it('Applying a styleset to a project should return the project with a COPY of the styleset applied', function (done) {
			request(host)
				.put('/styleset/' + stylesetId2 + "/project/" + projectId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project._id, projectId);
					assert.notEqual(res.body.project.styleset, stylesetId2);
					done();
				});
		}),
		it('Creating a document to which a styleset can be applied (document must be created AFTER Project.applyStyleset() is called so the document will get a default styleset)', function (done) {
			var text = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
				'<!DOCTYPE html>' +
				'<html xmlns="http://www.w3.org/1999/xhtml">' +
				'<head><title>Jimbo</title></head>' +
				'<body><p>Dagnabbit</p></body>' +
				'</html>';

			request(host)
				.post('/document')
				.set('cookie', cookie)
				.send({
					projectId: projectId,
					folderId: rootFolderId,
					name: 'Jimbo',
					text: text
				})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					document = res.body.document;
					assert.equal(res.body.document.name, 'Jimbo');
					assert.equal(res.body.document.projectId, projectId);
					assert.equal(res.body.document.folderId, rootFolderId);
					assert.equal(res.body.document.text, text);
					assert.equal(res.body.document.archived, false);
					assert.equal(res.body.document.members[0].userId, userId);
					assert.equal(res.body.document.members[0].access[0], "admin");
					stylesetDocumentId = res.body.document._id;
					stylesetDocumentId && done();
				});
		}),
		it('Applying (adding) a styleset to a document should return the document with a COPY of the styleset applied', function (done) {
			request(host)
				.put('/styleset/' + stylesetId2 + "/document/" + stylesetDocumentId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.document._id, stylesetDocumentId);
					assert.equal(res.body.document.stylesets.length, 2);
					stylesetCopiedId = res.body.document.stylesets[1];
					assert.notEqual(stylesetCopiedId, stylesetId2);
					stylesetCopiedId && done();
				});
		}),
		it('Opening a styleset should return the styleset', function (done) {
			request(host)
				.get('/styleset/' + stylesetId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset._id, stylesetId);
					assert.equal(res.body.styleset.name, "My Best Styleset");
					done();
				});
		}),
		it('Opening a style should return the style', function (done) {
			request(host)
				.get('/style/' + styleId2)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style._id, styleId2);
					assert.equal(res.body.style.name, "Coolio 2");
					assert.equal(res.body.style.class, "CoolioClass2");
					assert.equal(res.body.style.css, css2);
					done();
				});
		}),
		it('Opening a COPIED styleset should return the styleset pointing to its original styleset', function (done) {
			request(host)
				.get('/styleset/' + stylesetCopiedId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.original, stylesetId2);
					styleCopiedId = res.body.styleset.styles[0];
					styleCopiedId && done();
				});
		}),
		it('Opening a COPIED style should return the style pointing to its original style', function (done) {
			request(host)
				.get('/style/' + styleCopiedId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style.original, styleId2);
					done();
				});
		}),
		it('Updating a styleset should return success', function (done) {
			request(host)
				.put('/styleset/' + stylesetId + '/update')
				.set('cookie', cookie)
				.send({name: "OK, Maybe not the BEST, but...", styles: [styleId]})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Updating a style should return success', function (done) {
			request(host)
				.put('/style/' + styleId + '/update')
				.set('cookie', cookie)
				.send({name: "Donkey", class: "jack", css: css2 + "...some new CSS"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Creating a new styleset to test rearrange of stylesets below', function (done) {
			request(host)
				.post('/styleset')
				.set('cookie', cookie)
				.send({name: "My New Cool Styleset"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.name, "My New Cool Styleset");
					stylesetId3 = res.body.styleset._id;
					stylesetId3 && done();
				});
		}),
		it('Rearranging stylesets should return the project with the stylesets in the new order ', function (done) {
			request(host)
				.put('/styleset/rearrange')
				.set('cookie', cookie)
				.send({stylesets: [stylesetId3, stylesetId]})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.user.stylesets.length, 2);
					assert.equal(res.body.user.stylesets[0], stylesetId3);
					assert.equal(res.body.user.stylesets[1], stylesetId);
					done();
				});
		}),
		it('Archiving a styleset should return the archived styleset', function (done) {
			request(host)
				.put('/styleset/' + stylesetId + '/archive')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.name, "My Best Styleset");
					assert.equal(res.body.styleset.archived, true);
					done();
				});
		}),
		it('List of archived stylesets should return the single archived styleset', function (done) {
			request(host)
				.get('/styleset/archived')
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.stylesets.length, 1);
					assert.equal(res.body.stylesets[0].name, "My Best Styleset");
					done();
				});
		}),
		it('Unarchiving a styleset should return the unarchived styleset', function (done) {
			request(host)
				.put('/styleset/' + stylesetId + '/unarchive')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.name, "My Best Styleset");
					assert.equal(res.body.styleset.archived, false);
					done();
				});
		}),
		it('Archiving a style should return the archived style', function (done) {
			request(host)
				.put('/style/' + styleId + '/archive')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style._id, styleId);
					assert.equal(res.body.style.archived, true);
					done();
				});
		}),
		it('List of archived styles should return the single archived style', function (done) {
			request(host)
				.get('/style/archived')
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styles.length, 1);
					assert.equal(res.body.styles[0]._id, styleId);
					done();
				});
		}),
		it('Unarchiving a style should return the unarchived style', function (done) {
			request(host)
				.put('/style/' + styleId + '/unarchive')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style._id, styleId);
					assert.equal(res.body.style.archived, false);
					done();
				});
		}),
		it('Copying a project should return the copied project with COPIED documents and stylesets', function (done) {
			request(host)
				.post('/project/' + projectId + '/copy')
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					projectId5 = res.body.project._id;
					assert.notEqual(projectId5, projectId);
					assert.equal(res.body.project.documents.length, 6);
					assert.notEqual(res.body.project.documents[0], rootDocumentId);
					assert.notEqual(res.body.project.styleset, stylesetId);
					done();
				});
		})
	}),
	describe('Output', function () {
		it('Set all metadata - should return updated project', function (done) {
			var now = new Date;

			request(host)
				.put('/project/' + projectId + '/metadata')
				.set('cookie', cookie)
				.send({
					isbn: "1405353767",
					title: "Space: From Earth to the Edge of the Universe",
					description: "Take an incredible journey through Space...",
					authors: ["Carole Stott", "Robert Dinwiddie", "Giles Sparrow"],
					keywords: ["ABQ", "ACBN", "FRH", "WSBB"],
					language: "English",
					publicationDate: now,
					type: "MUS018000",
					rights: "© Det Gamle Forlag",
					contributors: [
						{
							role: "edt",
							name: "Ole Olsen"
						},
						{
							role: "pte",
							name: "Jytte Ustantinious"
						}
					],
					publisher: "Det Gamle Forlag",
					cover: "images/frontpage.jpg",
					coverage: "Asia",
					relation: "Part 2",
					source: "Det Gode Bibliotek"
				})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.metadata.isbn, "1405353767");
					assert.equal(res.body.project.metadata.title, "Space: From Earth to the Edge of the Universe");
					assert.equal(res.body.project.metadata.description, "Take an incredible journey through Space...");
					assert.equal(res.body.project.metadata.authors.length, 3);
					assert.equal(res.body.project.metadata.authors[0], "Carole Stott");
					assert.equal(res.body.project.metadata.authors[1], "Robert Dinwiddie");
					assert.equal(res.body.project.metadata.authors[2], "Giles Sparrow");
					assert.equal(res.body.project.metadata.keywords[0], "ABQ");
					assert.equal(res.body.project.metadata.keywords[1], "ACBN");
					assert.equal(res.body.project.metadata.keywords[2], "FRH");
					assert.equal(res.body.project.metadata.keywords[3], "WSBB");
					assert.equal(res.body.project.metadata.language, "English");
					// TODO: assert publicationDate has value from input: db is currently 1 hour behind + format date appropriately
					//assert.equal(res.body.project.metadata.publicationDate, now.format("YYYY-MM-DDTHH:mm:ss.SSSZ"));
					assert.equal(res.body.project.metadata.type, "MUS018000");
					assert.equal(res.body.project.metadata.rights, "© Det Gamle Forlag");
					assert.equal(res.body.project.metadata.contributors[0].role, "edt");
					assert.equal(res.body.project.metadata.contributors[0].name, "Ole Olsen");
					assert.equal(res.body.project.metadata.contributors[1].role, "pte");
					assert.equal(res.body.project.metadata.contributors[1].name, "Jytte Ustantinious");
					assert.equal(res.body.project.metadata.publisher, "Det Gamle Forlag");
					assert.equal(res.body.project.metadata.cover, "images/frontpage.jpg");
					assert.equal(res.body.project.metadata.coverage, "Asia");
					assert.equal(res.body.project.metadata.relation, "Part 2");
					assert.equal(res.body.project.metadata.source, "Det Gode Bibliotek");
					done();
				});
		}),
		it('Set metadata TOC - should return updated project', function (done) {
			request(host)
				.put('/project/' + projectId + '/toc')
				.set('cookie', cookie)
				.send({entries: [
					{title: "Cover", target: "HTML/Cover.html", "level": "0"},
					{title: "Title Page", target: "HTML/TitlePage.html", "level": "0"},
				]})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.metadata.title, "Space: From Earth to the Edge of the Universe");
					assert.equal(res.body.project.metadata.authors.length, 3);
					assert.equal(res.body.project.metadata.toc.entries.length, 2);
					assert.equal(res.body.project.metadata.toc.entries[0].title, "Cover");
					assert.equal(res.body.project.metadata.toc.entries[1].title, "Title Page");
					done();
				});
		}),
		it('Uploading a font to a user should return success', function (done) {
			// TODO: when an API call for this exists, change this code to use it. For now, fake it...

			// Copy font from source, test dir, to destination, public dir
			var fontName = 'casper.ttf';
			var srcUserFontsDir = path.join('test', 'resources', 'user-fonts');
			var srcFont = path.join(srcUserFontsDir, fontName);

			var userDir = path.join(conf.resources.usersDir, conf.epub.userDirPrefix + userId);
			var dstUserFontsDir = path.join(userDir, conf.epub.fontsDir);

			fs.mkdir(dstUserFontsDir, function (err) {
				if (err) {
					throw err;
				}
				var dstFont = path.join(dstUserFontsDir, fontName);
				fs.createReadStream(srcFont).pipe(fs.createWriteStream(dstFont));
				done();
			});
		}),
		it('Uploading an image to a project should return success', function (done) {
			// TODO: when an API call for this exists, change this code to use it. For now, fake it...

			// Copy image from source, test dir, to destination, public dir
			var imageName = 'Scripler_logo.jpg';
			var srcImagesDir = path.join('test', 'resources', 'images');
			var srcImage = path.join(srcImagesDir, imageName);

			var projectDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + projectId);
			var dstImagesDir = path.join(projectDir, conf.epub.imagesDir);

			fs.mkdir(dstImagesDir, function (err) {
				if (err) {
					throw err;
				}
				var dstImage = path.join(dstImagesDir, imageName);
				fs.createReadStream(srcImage).pipe(fs.createWriteStream(dstImage));
				done();
			});
		}),
		it('Compiling a project should return the compiled project (as an EPUB archive)', function (done) {
			request(host)
				.get('/project/' + projectId + '/compile')
				.set('cookie', cookie)
				.expect(200)
				.expect('Content-Type', 'application/epub+zip')
				.parse(function (res, callback) {
					res.setEncoding('binary');
					res.data = '';
					res.on('data', function (chunk) {
						res.data += chunk;
					});
					res.on('end', function () {
						callback(null, new Buffer(res.data, 'binary'));
					});
				}).end(function (err, res) {
					if (err) return done(err);

					// binary response data is in res.body as a buffer
					assert.ok(Buffer.isBuffer(res.body));
					//console.log("res: ", res.body);
					var epub = projectId + '.epub';
					fs.writeFile(epub, res.body);

					child = exec('java -jar test/epubcheck-3.0b5.jar ' + epub,
						function (error, stdout, stderr) {
							if (error !== null) {
								console.log('exec error: ' + error);
								throw error;
							}
							if (cleanupEPUB) {
								fs.unlinkSync(epub);
							}
							done();
						});
				});
		})
	}),
	describe('Import', function () {
		it('Uploading/Importing a file to a project, should return the a new document with the imported content', function (done) {
			var fileContent = 'This is some file content';
			var filename = 'test.docx';
			var filepath = path.join('test', 'resources', 'import', filename);
			var boundary = Math.random();

			request(host)
				.post('/document/'+projectId+'/upload')
				.set('cookie', cookie)
				.attach('file', filepath)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					document = res.body.document;
					assert.equal(res.body.document.name, filename);
					assert.equal(res.body.document.projectId, projectId);
					//TODO: When we got a proper semi-automated docvert setup on both Windows and Unix, do assertion of imported text!
					//assert.equal(res.body.document.text, '???');
					assert.equal(res.body.document.archived, false);
					assert.equal(res.body.document.members[0].userId, userId);
					assert.equal(res.body.document.members[0].access[0], "admin");
					childDocumentId = res.body.document._id;
					childDocumentId && done();
				});
		})
	}),
	describe('Cleanup', function () {
		it('Deleting a project should return success', function (done) {
			request(host)
				.del('/project/' + projectId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Deleting a project should return success - clean up project #2', function (done) {
			request(host)
				.del('/project/' + projectId2)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Opening a document of a deleted project should return not-found', function (done) {
			request(host)
				.get('/document/' + childDocumentId)
				.set('cookie', cookie)
				.expect(404)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Opening the copied project should still return its six copied documents (but no metadata since this was added AFTER the copy was made).', function (done) {
			request(host)
				.get('/project/' + projectId4)
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.documents.length, 6);

					assert.equal(res.body.project.documents[0].name, "MySecondDocument");
					assert.equal(res.body.project.documents[0].text, undefined);

					assert.equal(res.body.project.documents[1].name, "A New Cool Name");
					assert.equal(res.body.project.documents[1].text, undefined);

					assert.equal(res.body.project.documents[2].name, "Cover");
					assert.equal(res.body.project.documents[2].text, undefined);

					assert.equal(res.body.project.documents[3].name, "TitlePage");
					assert.equal(res.body.project.documents[3].text, undefined);

					assert.equal(res.body.project.documents[4].name, "ToC");
					assert.equal(res.body.project.documents[4].text, undefined);

					assert.equal(res.body.project.documents[5].name, "Colophon");
					assert.equal(res.body.project.documents[5].text, undefined);
					done();
				});
		}),
		it('Deleting a project should return success - clean up project copy (#4)', function (done) {
			request(host)
				.del('/project/' + projectId4)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Deleting a project should return success - clean up project copy (#5)', function (done) {
			request(host)
				.del('/project/' + projectId5)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		})
	})
})
