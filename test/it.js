process.env.NODE_ENV = 'test';

var assert = require("assert")
	, conf = require('config')
	, app = require('../app')
	, mongoose = require('mongoose')
	, request = require('supertest')
	, fs = require('fs')
	, path = require('path')
	, moment = require('moment')
	, utils = require('../public/create/scripts/utils-shared')
	, styleset_utils = require('../lib/styleset-utils')
	, user_utils = require('../lib/user-utils')
	, font_utils = require('../lib/font-utils')
	, Font = require('../models/font.js').Font
	, chai_assert = require("chai").assert;

var exec = require('child_process').exec,
	child;

var host = '127.0.0.1:' + conf.app.port;
var cookie;

var userId;

var projectId;
var projectId2;
var projectId3;
var projectId4;
var projectId5;

var rootFolderId;
var childFolderId;

var rootDocumentId;
var childDocumentId;
var coverDocumentId;
var titlePageDocumentId;
var tocDocumentId;
var colophonDocumentId;
var copyCrappyDocumentId;
var jimboDocumentId;

var text;

const numberOfStylesInSystemStyleset = 31;

// -------------------- User styleset and style ids --------------------

var defaultUserStyleset;
var userStylesetId1;
var userStylesetId2;
var userStylesetId3;
var userStylesetId3OriginalLength = numberOfStylesInSystemStyleset;
var userStylesetId4;
var userStyleId1;
var userStyleId2;
var userStyleId4;
var userStyleId3;

// -------------------- Document styleset and style ids --------------------

var documentStylesetId1;
var documentStylesetId2;
var documentStylesetId3;
var documentStylesetId3OriginalLength = userStylesetId3OriginalLength;
var documentStylesetId3Length;
var documentStylesetId4;

var documentStyleId1;
var documentStyleId2;
var documentStyleId3;

var imageId;
var imageName;

var cleanupEPUB = true;

if (conf.db.uri.match(/_test(\?|$)/) === null) {
	console.log("You shouldn't be running this test on any database not being specifically meant for 'test'!");
	console.log("You tried with this database: " + conf.db.uri);
	process.exit(1);
}

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
					assert.equal(res.body.user.level, "free");
					user_utils.changeLevel(res.body.user._id, "premium", function (err) {
						if (err) throw new Error(err);
						done();
					});
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
					assert.equal(res.body.user.level, "premium");
					done();
				});
		})
	}),
	describe('Add system/Scripler stylesets/styles and fonts', function () {
		/*
		it('Creating a system styleset should return the new styleset', function (done) {
			systemStyleset1 = styleset_utils.createStyleset(conf.user.defaultStylesetName, true, 1);
			systemStyleset1.save(function(err) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(systemStyleset1.name, conf.user.defaultStylesetName);
					assert.equal(systemStyleset1.isSystem, true);
					systemStylesetId1 = systemStyleset1._id;
					systemStylesetId1 && done();
				});
		}),
		it('Creating a system style should return the new style', function (done) {
			var systemStyle1 = styleset_utils.createStyle("Scripler Style 1", "ScruplerZ", {"key1": "value1", "key2": "value2"}, null, systemStylesetId1, true, false);
			systemStyle1.save(function(err) {
                if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
				assert.equal(systemStyle1.name, "Scripler Style 1");
				assert.equal(systemStyle1.class, "ScruplerZ");
				assert.equal(systemStyle1.css.key1, "value1");
				assert.equal(systemStyle1.css.key2, "value2");
				assert.equal(systemStyle1.isSystem, true);
				assert.equal(systemStyle1.stylesetId, systemStylesetId1);

				systemStyleset1.styles.addToSet(systemStyle1);
				systemStyleset1.save(function (err) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					systemStyleId1 = systemStyle1._id;
					systemStyleId1 && done();
				});
			});
		}),
		it('Creating a hidden system style should return the new style', function (done) {
			var systemStyle2 = styleset_utils.createStyle("Scripler Style 2", "ScruplerZ999", {"key1": "value1", "key2": "value2"}, null, systemStylesetId1, true, true);
			systemStyle2.save(function(err) {
				if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
				assert.equal(systemStyle2.name, "Scripler Style 2");
				assert.equal(systemStyle2.class, "ScruplerZ999");
				assert.equal(systemStyle2.css.key1, "value1");
				assert.equal(systemStyle2.css.key2, "value2");
				assert.equal(systemStyle2.isSystem, true);
				assert.equal(systemStyle2.stylesetId, systemStylesetId1);

				systemStyleset1.styles.addToSet(systemStyle2);
				systemStyleset1.save(function (err) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					systemStyleId1 = systemStyle2._id;
					systemStyleId1 && done();
				});
			});
		}),
		*/
		it('Create all system stylesets such that they are available when the user registers', function (done) {
			styleset_utils.import_system_stylesets(true, false, function (err) {
				if (err) {
					callback(err);
				}

				done();
			});
		}),
		it('Create all system fonts such that they are available for the EPUB generation (GET /project/compile)', function (done) {
			font_utils.import_system_fonts(true, false, function (err) {
				if (err) {
					callback(err);
				}

				done();
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
					assert.equal(res.body.user.stylesets.length, 17);
					userStylesetId1 = res.body.user.stylesets[0]; // book-bw
					userStylesetId2 = res.body.user.stylesets[1]; // book-color
					userStylesetId3 = res.body.user.stylesets[2]; // draft-bw
					userStylesetId4 = res.body.user.stylesets[3]; // draft-color
					defaultUserStyleset = res.body.user.stylesets[15]; // simple-bw
					//assert.notEqual(userStylesetId1, systemStylesetId1); // Stylesets are copied
					//assert.notEqual(res.body.user.defaultStyleset, systemStylesetId1);
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
					assert.equal(!res.body.user.defaultStyleset, false);
					done();
				});
		}),
		it('Update current user\'s profile name', function (done) {
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
		it('Update current user\'s profile with invalid email should return error', function (done) {
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
		}),
		it('Opening a user styleset to verify its contents', function (done) {
			request(host)
				.get('/styleset/' + userStylesetId1)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					//console.log('userStylesetId1: ' + JSON.stringify(res.body.styleset));
					assert.equal(res.body.styleset._id, userStylesetId1);
					assert.equal(res.body.styleset.name, "book-bw");
					assert.equal(res.body.styleset.styles.length, numberOfStylesInSystemStyleset);
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
					assert.equal(res.body.project.styleset, defaultUserStyleset);
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
		var css = {
			'content': 'attr(data-info)',
			'color': '#47a3da',
			'position': 'absolute',
			'width': '600%',
			'top': '120%',
			'text-align': 'right',
			'right': '0',
			'opacity': '0',
			'pointer-events': 'none'
		};

		it('Creating a styleset is not allowed for free users', function (done) {
			request(host)
				.post('/styleset')
				.set('cookie', cookie)
				.send({name: "My Best Styleset", isSystem: false, order: 10})
				.expect(402)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    done();
				});
		}),
		it('Change user level: premium', function (done) {
			user_utils.changeLevel(userId, "premium", function (err) {
				if (err) throw new Error(err);
				done();
			});
		}),
		/*
		it('Creating a styleset should return the new styleset', function (done) {
			request(host)
				.post('/styleset')
				.set('cookie', cookie)
				.send({name: "My Best Styleset", isSystem: false, order: 10})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.name, "My Best Styleset");
					assert.equal(res.body.styleset.order, 10);
					userStylesetId2 = res.body.styleset._id;
					userStylesetId2 && done();
				});
		}),
		*/
		it('Change user level: free', function (done) {
			user_utils.changeLevel(userId, "free", function (err) {
				if (err) throw new Error(err);
				done();
			});
		}),
		it('Creating a style is not allowed for free users', function (done) {
			request(host)
				.post('/style')
				.set('cookie', cookie)
				.send({stylesetId: userStylesetId2, name: "Coolio", class: "CoolioClass", css: css, isSystem: false})
				.expect(402)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Change user level: premium', function (done) {
			user_utils.changeLevel(userId, "premium", function (err) {
				if (err) throw new Error(err);
				done();
			});
		}),
		it('Creating a document, to which a styleset can be applied, should return the document', function (done) {
			var text = '<p>This copying logic is going to be the end of us!</p>';

			request(host)
				.post('/document')
				.set('cookie', cookie)
				.send({
					projectId: projectId2,
					name: 'Copycrappy',
					text: text
				})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.document.name, 'Copycrappy');
					assert.equal(res.body.document.projectId, projectId2);
					assert.equal(res.body.document.text, text);
					assert.equal(res.body.document.archived, false);
					assert.equal(res.body.document.members[0].userId, userId);
					assert.equal(res.body.document.members[0].access[0], "admin");
					assert.notEqual(res.body.document.defaultStyleset, userStylesetId2);
					copyCrappyDocumentId = res.body.document._id;
					copyCrappyDocumentId && done();
				});
		}),
		it('Applying a styleset to a document should return a styleset. This styleset will be used below to add a style to because a style must be added to a non-system styleset with an original.', function (done) {
			request(host)
				.put('/styleset/' + userStylesetId2 + "/document/" + copyCrappyDocumentId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					documentStylesetId2 = res.body.styleset._id;
					documentStylesetId2 && done();
				});
		}),
		it('Creating a style should return the new style', function (done) {
			request(host)
				.post('/style')
				.set('cookie', cookie)
				.send({stylesetId: documentStylesetId2, name: "Coolio", class: "CoolioClass", css: css, isSystem: false})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style.name, "Coolio");
					assert.equal(res.body.style.class, "CoolioClass");
					assert.deepEqual(res.body.style.css, css);
					assert.equal(res.body.style.stylesetId, documentStylesetId2);
					documentStyleId1 = res.body.style._id;
					documentStyleId1 && done();
				});
		}),
		it('Applying a styleset to a project should return the project with the styleset applied (set)', function (done) {
			request(host)
				.put('/styleset/' + userStylesetId1 + "/project/" + projectId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project._id, projectId);
					assert.equal(res.body.project.styleset, userStylesetId1);
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
				var text = '<p>It is my best document ever!</p>';

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
						assert.equal(res.body.document.name, 'MyFirstDocument');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, rootFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.notEqual(res.body.document.defaultStyleset, userStylesetId1);
						documentStylesetId1 = res.body.document.defaultStyleset;
						rootDocumentId = res.body.document._id;
						rootDocumentId && done();
					});
			}),
			it('Creating a document in a folder (the child folder) should return the document with that folder id - 2', function (done) {
				var text = '<p>It is almost my best document!</p>';

				request(host)
					.post('/document')
					.set('cookie', cookie)
					.send({projectId: projectId, folderId: childFolderId, name: 'MySecondDocument', text: text})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.document.name, 'MySecondDocument');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, childFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.notEqual(res.body.document.defaultStyleset, userStylesetId1);
						childDocumentId = res.body.document._id;
						childDocumentId && done();
					});
			}),
			it('Creating a cover document should return the document with type = "cover"', function (done) {
				var text = '<p>Cool Cover</p>';

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
						assert.equal(res.body.document.name, 'Cover');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, rootFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.equal(res.body.document.type, 'cover');
						assert.notEqual(res.body.document.defaultStyleset, userStylesetId1);
						coverDocumentId = res.body.document._id;
						coverDocumentId && done();
					});
			}),
			it('Creating a title page document should return the document with type = "titlepage"', function (done) {
				var text = '<p>Cool TitlePage</p>';

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
						assert.equal(res.body.document.name, 'TitlePage');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, rootFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.equal(res.body.document.type, 'titlepage');
						assert.notEqual(res.body.document.defaultStyleset, userStylesetId1);
						titlePageDocumentId = res.body.document._id;
						titlePageDocumentId && done();
					});
			}),
			it('Creating a table of contents document should return the document with type = "toc"', function (done) {
				var text = '<p>Cool ToC</p>';

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
						assert.equal(res.body.document.name, 'ToC');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, rootFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.equal(res.body.document.type, 'toc');
						assert.notEqual(res.body.document.defaultStyleset, userStylesetId1);
						tocDocumentId = res.body.document._id;
						tocDocumentId && done();
					});
			}),
			it('Creating a colophon document should return the document with type = "colophon"', function (done) {
				var text = '<p>Cool Colophon</p>';

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
						assert.equal(res.body.document.name, 'Colophon');
						assert.equal(res.body.document.projectId, projectId);
						assert.equal(res.body.document.folderId, rootFolderId);
						assert.equal(res.body.document.text, text);
						assert.equal(res.body.document.archived, false);
						assert.equal(res.body.document.members[0].userId, userId);
						assert.equal(res.body.document.members[0].access[0], "admin");
						assert.equal(res.body.document.type, 'colophon');
						assert.notEqual(res.body.document.defaultStyleset, userStylesetId1);
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
			it('Updating a document text should return the updated document', function (done) {
				text = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
					'<!DOCTYPE html>' +
					'<html xmlns="http://www.w3.org/1999/xhtml">' +
					'<head><title>MyFirstDocument</title></head>' +
					'<body><p>This is no longer a matter of if but when...and look here...</p></body>' +
					'</html>';

				request(host)
					.put('/document/' + rootDocumentId + '/update')
					.set('cookie', cookie)
					.send({text: text, defaultStyleset: userStylesetId1})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.document.defaultStyleset, userStylesetId1);
						assert.equal(res.body.document.text, text);
						assert.equal(utils.containsModel(res.body.document.stylesets, userStylesetId1), false);
						done();
					});
			}),
			it('Updating a documents defaultStyleset should return the updated document', function (done) {
				request(host)
					.put('/document/' + rootDocumentId + '/update')
					.set('cookie', cookie)
					.send({defaultStyleset: userStylesetId1})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.document.defaultStyleset, userStylesetId1);
						assert.equal(res.body.document.text, text);
						done();
					});
			}),
			it('Trying to update a documents text to null should be ignored, and return the unchanged document', function (done) {
				request(host)
					.put('/document/' + rootDocumentId + '/update')
					.set('cookie', cookie)
					.send({text: null})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.document.defaultStyleset, userStylesetId1);
						assert.equal(res.body.document.text, text);
						done();
					});
			}),
			it('Update a documents text to empty string should return the changed document', function (done) {
				request(host)
					.put('/document/' + rootDocumentId + '/update')
					.set('cookie', cookie)
					.send({text: ""})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
						assert.equal(res.body.document.defaultStyleset, userStylesetId1);
						assert.equal(res.body.document.text, "");
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
						assert.equal(utils.containsDocWithFolderId(res.body.result.docs, rootFolderId), true);
						assert.equal(utils.containsModel(res.body.result.docs, rootDocumentId), true);
						assert.equal(utils.containsModel(res.body.result.docs, coverDocumentId), true);
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
						assert.equal(utils.containsDocWithFolderId(res.body.result.docs, rootFolderId), true);
						assert.equal(utils.containsModel(res.body.result.docs, rootDocumentId), true);
						assert.equal(utils.containsModel(res.body.result.docs, coverDocumentId), true);
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
						assert.equal(utils.containsModel(res.body.result.folders, childFolderId), true);

						assert.equal(res.body.result.docs.length, 5);
						assert.equal(utils.containsDocWithFolderId(res.body.result.docs, rootFolderId), true);
						assert.equal(utils.containsModel(res.body.result.docs, rootDocumentId), true);
						assert.equal(utils.containsModel(res.body.result.docs, coverDocumentId), true);
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
				var text = '<h1 id="id_1">Introduction</h1>' +
					'<p>It is another one of my worst documents ever!</p>';

				request(host)
					.post('/document')
					.set('cookie', cookie)
					.send({projectId: projectId, folderId: childFolderId, name: 'Sikke et dokument', text: text})
					.expect(200)
					.end(function (err, res) {
						if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
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
		var css2 = {
			'content':        'attr(data-info)',
			'color':          '#27a3da',
			'position':       'absolute',
			'width':          '500%',
			'top':            '110%',
			'text-align':     'left',
			'right':          '5',
			'opacity':        '10',
			'pointer-events': 'none'
		};

		/*
		it('Creating a styleset should return the new styleset, a user styleset', function (done) {
		request(host)
			.post('/styleset')
			.set('cookie', cookie)
			.send({name: "My Best Styleset 2"})
			.expect(200)
			.end(function (err, res) {
				if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
				assert.equal(res.body.styleset.name, "My Best Styleset 2");
				userStylesetId3 = res.body.styleset._id;
				userStylesetId3 && done();
			});
		}),
		*/
		it('Creating a user style should return the new style', function (done) {
			request(host)
				.post('/style')
				.set('cookie', cookie)
				.send({stylesetId: userStylesetId3, name: "Coolio 2", class: "CoolioClass2", css: css2, tag: "h1"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style.name, "Coolio 2");
					assert.equal(res.body.style.class, "CoolioClass2");
					assert.deepEqual(res.body.style.css, css2);
					assert.equal(res.body.style.tag, "h1");
					userStyleId4 = res.body.style._id;
					assert.equal(res.body.style.stylesetId, userStylesetId3);
					done();
					//documentStylesetId17 = res.body.style.stylesetId;
					//documentStylesetId17 && done();
				});
		}),
		it('Applying a user styleset to a document should return a document styleset, a document styleset. This styleset will be used below to add a style to because a style must be added to document stylesets.', function (done) {
			request(host)
				.put('/styleset/' + userStylesetId3 + "/document/" + copyCrappyDocumentId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					documentStylesetId3 = res.body.styleset._id;
					assert.equal(res.body.styleset.styles.length, numberOfStylesInSystemStyleset + 1);
					documentStylesetId3 && done();
				});
		}),
		it('Get the number of stylesets in the document styleset so we can compare it (next test case) with the number of styles in the original user styleset.', function (done) {
			request(host)
				.get('/styleset/' + documentStylesetId3)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset._id, documentStylesetId3);
					assert.equal(res.body.styleset.original, userStylesetId3);
					documentStylesetId3Length = res.body.styleset.styles.length;
					assert.equal(documentStylesetId3Length, documentStylesetId3OriginalLength + 1);
					done();
				});
		}),
		it('Check that the new style was added to the original user styleset, compare number of styles of user and document stylesets and save the style id of the user style (for later "original" comparison").', function (done) {
			request(host)
				.get('/styleset/' + userStylesetId3)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset._id, userStylesetId3);
					assert.equal(res.body.styleset.name, "draft-bw");
					var userStylesetId3Length = res.body.styleset.styles.length;
					assert.equal(userStylesetId3Length, userStylesetId3OriginalLength + 1);
					assert.equal(documentStylesetId3Length, userStylesetId3Length);
					userStyleId1 = res.body.styleset.styles[userStylesetId3Length-1]._id;
					assert.equal(userStylesetId3Length, documentStylesetId3Length);
					done();
				});
		}),
		it('Applying a styleset to a project should return the project with the styleset applied', function (done) {
			request(host)
				.put('/styleset/' + userStylesetId4 + "/project/" + projectId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project._id, projectId);
					assert.equal(res.body.project.styleset, userStylesetId4);
					done();
				});
		}),
		it('Creating a document to which a styleset can be applied (document must be created AFTER Project.applyStyleset() is called so the document will get a default styleset)', function (done) {
			var text = '<h1 id="id_97">Partey</h1>' +
				'<p>Dagnabbit</p>' +
				'<h6 id="id_453">Not important</h6>' +
				'<p><a id="id_24" title="NoGo" href="http://www.scripler.com">This is not an anchor and should not be included in the ToC</a>. And now for some Danish: På Ærø æder ålen Åge æg og drikker ØL!</p>' +
				'<p><a id="id_25" title="LinkyDinky">This IS an anchor and should be included in the ToC</a></p>';

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
					assert.equal(res.body.document.name, 'Jimbo');
					assert.equal(res.body.document.projectId, projectId);
					assert.equal(res.body.document.folderId, rootFolderId);
					assert.equal(res.body.document.text, text);
					assert.equal(res.body.document.archived, false);
					assert.equal(res.body.document.members[0].userId, userId);
					assert.equal(res.body.document.members[0].access[0], "admin");
					assert.notEqual(res.body.document.defaultStyleset, userStylesetId4);
					assert.equal(utils.containsModel(res.body.document.stylesets, userStylesetId4), false);
					documentStylesetId4 = res.body.document.defaultStyleset;
					assert.equal(utils.containsModel(res.body.document.stylesets, documentStylesetId4), true);
					jimboDocumentId = res.body.document._id;
					jimboDocumentId && done();
				});
		}),
		it('Rearranging stylesets (user and document) should return the stylesets in the new order', function (done) {
			var userStylesetId1Order = { id: userStylesetId1, order: 3};
			var userStylesetId2Order = { id: userStylesetId2, order: 9};
			var documentStylesetId2Order = { id: documentStylesetId4, order: 26};

			request(host)
				.put('/styleset/rearrange')
				.set('cookie', cookie)
				.send({orderedStylesets: [userStylesetId1Order, userStylesetId2Order, documentStylesetId2Order]})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					//console.log('stylesets: ' + JSON.stringify(res.body.stylesets));
					assert.equal(res.body.stylesets[0].id, userStylesetId1);
					assert.equal(res.body.stylesets[0].order, 3);
					assert.equal(res.body.stylesets[1].id, userStylesetId2);
					assert.equal(res.body.stylesets[1].order, 9);
					assert.equal(res.body.stylesets[2].id, documentStylesetId4);
					assert.equal(res.body.stylesets[2].order, 26);
					done();
				});
		}),
		it('Listing stylesets for a document should return the union of the document\'s stylesets (including the default) and all user stylesets not already copied to the document', function (done) {
			request(host)
				.get('/document/' + jimboDocumentId + '/stylesets')
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.stylesets.length, 17);
					// Currently document stylesets are returned before user stylesets but we should not rely on this => just check if the id exists *somewhere* in the list.
					assert.equal(utils.containsModel(res.body.stylesets, userStylesetId1), true);
					assert.equal(utils.containsModel(res.body.stylesets, userStylesetId4), false); // Copied to documentStylesetId4
					assert.equal(utils.containsModel(res.body.stylesets, documentStylesetId4), true);
					assert.equal(styleset_utils.hasHiddenStyle(res.body.stylesets[0].styles, 'figcaption'), true);
					assert.equal(styleset_utils.hasHiddenStyle(res.body.stylesets[0].styles, 'Body text'), false);
					done();
				});
		}),
		it('Opening a document styleset should return the styleset', function (done) {
			request(host)
				.get('/styleset/' + documentStylesetId4)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset._id, documentStylesetId4);
					assert.equal(res.body.styleset.styles.length, numberOfStylesInSystemStyleset);
					assert.equal(res.body.styleset.name, "draft-color");
					done();
				});
		}),
		it('Opening a user style should return the style', function (done) {
			request(host)
				.get('/style/' + userStyleId4)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style._id, userStyleId4);
					assert.equal(res.body.style.name, "Coolio 2");
					assert.equal(res.body.style.class, "CoolioClass2");
					assert.deepEqual(res.body.style.css, css2);
					assert.equal(res.body.style.tag, "h1");
					done();
				});
		}),
		it('Opening a document styleset should return the styleset pointing to its original user styleset', function (done) {
			request(host)
				.get('/styleset/' + documentStylesetId3)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.original, userStylesetId3);
					documentStylesetId3Length = res.body.styleset.styles.length;
					assert.equal(documentStylesetId3Length, documentStylesetId3OriginalLength + 1); // Rememeber, a new style was added to userStylesetId3 and thus also to documentStylesetId1
					done();
					//documentStyleId4 = res.body.styleset.styles[documentStylesetId3Length - 1]._id;
					//documentStyleId4 && done();
				});
		}),
		it('Creating a new style for testing updating a styleset by adding a style to it', function (done) {
            css2["vuf"] = "5px";
			request(host)
				.post('/style')
				.set('cookie', cookie)
				.send({stylesetId: documentStylesetId3, name: "Vuf", class: "VufClass", css: css2, tag: ""})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style.name, "Vuf");
					assert.equal(res.body.style.class, "VufClass");
					assert.equal(res.body.style.css.vuf, "5px");
					assert.equal(res.body.style.tag, "");
					documentStyleId2 = res.body.style._id;
					assert.notEqual(documentStyleId2, null);
					assert.equal(res.body.style.stylesetId, documentStylesetId3);
					done();
				});
		}),
		it('Opening a document style to get its original style (was updated above)', function (done) {
			request(host)
				.get('/style/' + documentStyleId2)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					userStyleId3 = res.body.style.original;
					assert.notEqual(userStyleId3, null);
					done();
				});
		}),
		it('Creating one more new style for for the same styleset', function (done) {
			request(host)
				.post('/style')
				.set('cookie', cookie)
				.send({stylesetId: documentStylesetId3, name: "Vuf - 2", class: "xxx123", css: {some: "stuff"}, tag: "h3"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style.name, "Vuf - 2");
					assert.equal(res.body.style.class, "xxx123");
					assert.equal(res.body.style.css.some, "stuff");
					assert.equal(res.body.style.tag, "h3");
					assert.equal(res.body.style.stylesetId, documentStylesetId3);
					documentStyleId3 = res.body.style._id;
					documentStyleId3 && done();
				});
		}),
		it('Updating a copied document styleset by OVERWRITING its styles with two new styles, should return the updated styleset.', function (done) {
			var styles = [documentStyleId2, documentStyleId3];
			request(host)
				.put('/styleset/' + documentStylesetId3 + '/update')
				.set('cookie', cookie)
				.send({name: "OK, Maybe not the BEST, but...", styles: styles, order: 19})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.order, 19);
					assert.equal(res.body.styleset._id, documentStylesetId3);
					assert.equal(res.body.styleset.styles.length, 2);
					assert.equal(res.body.styleset.styles[0], documentStyleId2);
					assert.equal(res.body.styleset.styles[1], documentStyleId3);
					assert.equal(res.body.styleset.original, userStylesetId3);
					assert.equal(res.body.styleset.name, "OK, Maybe not the BEST, but...");
					done();
				});
		}),
		it('Opening a user styleset whose document copy was updated should return the updated contents on the user styleset', function (done) {
			request(host)
				.get('/styleset/' + userStylesetId3)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.name, "OK, Maybe not the BEST, but...");
					assert.equal(res.body.styleset.styles.length, 2); // All the styles originally from the system styleset should now have been removed.
					//userStyleId1 = res.body.styleset.styles[0]._id;
					done();
				});
		}),
		it('Opening a document style from which a copy was made during addition of a style to a styleset, should return the style with the copy as its original', function (done) {
			request(host)
				.get('/style/' + documentStyleId2)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					userStyleId2 = res.body.style.original;
					assert.notEqual(userStyleId2, null);
					assert.equal(res.body.style.stylesetId, documentStylesetId3);
					done();
				});
		}),
		it('Opening a style that was ADDED, i.e. copied, to a styleset as part of updating the styleset, should return the style with an empty original', function (done) {
			request(host)
				.get('/style/' + userStyleId2)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style.original, null);
					assert.equal(res.body.style.stylesetId, userStylesetId3);
					done();
				});
		}),
		it('Consecutive times when that styleset is updated, the same styleset with updated values should be returned', function (done) {
			var styles = [documentStyleId2, documentStyleId3];
			request(host)
				.put('/styleset/' + documentStylesetId3 + '/update')
				.set('cookie', cookie)
				.send({name: "Actually, it is my best!", styles: styles})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset._id, documentStylesetId3);
					assert.equal(res.body.styleset.name, "Actually, it is my best!");
					assert.equal(res.body.styleset.styles.length, 2);
					assert.equal(res.body.styleset.styles[0], documentStyleId2);
                    assert.equal(res.body.styleset.styles[1], documentStyleId3);
					done();
				});
		}),
		it('The first time a style is updated, the updated style should be returned.', function (done) {
            css2["another-key"] = 'another value';
			request(host)
				.put('/style/' + documentStyleId2 + '/update')
				.set('cookie', cookie)
				.send({name: "Donkey", class: "jack", css: css2})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style._id, documentStyleId2);
					assert.equal(res.body.style.name, "Donkey");
					assert.equal(res.body.style.class, "jack");
					assert.equal(res.body.style.css["another-key"], "another value");
					done();
				});
		}),
		it('Opening a(n original) user style whose COPY was updated should return the updated contents on the style - 1', function (done) {
			request(host)
				.get('/style/' + userStyleId2)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style.name, "Donkey");
					assert.equal(res.body.style.class, "jack");
                    assert.equal(res.body.style.css["another-key"], "another value");
					done();
				});
		}),
		it('Consecutive times when that style is updated, the same style with updated values should be returned', function (done) {
            css2["another-key"] = 'yet another value';
			request(host)
				.put('/style/' + documentStyleId2 + '/update')
				.set('cookie', cookie)
				.send({name: "DonkeyKong", class: "jytte", css: css2})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    //console.log(res.body);
					assert.equal(res.body.style._id, documentStyleId2);
					assert.equal(res.body.style.name, "DonkeyKong");
					assert.equal(res.body.style.class, "jytte");
					assert.equal(res.body.style.original, userStyleId3);
					assert.deepEqual(res.body.style.css, css2);
					done();
				});
		}),
		it('Opening a(n original) user style whose COPY was updated should return the updated contents on the style - 2', function (done) {
			request(host)
				.get('/style/' + userStyleId3)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style.name, "DonkeyKong");
					assert.equal(res.body.style.class, "jytte");
					assert.equal(res.body.style.css["another-key"], "yet another value");
					assert.deepEqual(res.body.style.css, css2);
					done();
				});
		}),
		it('Updating a copied (document) style to test if the values are copied back to the original style, when the STYLESET is updated.', function (done) {
			css2.fancy = 'ew ew ew';
			request(host)
				.put('/style/' + documentStyleId2 + '/update')
				.set('cookie', cookie)
				.send({name: "FancyPantsy", class: "pantsy", css: css2})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style._id, documentStyleId2);
					assert.equal(res.body.style.name, "FancyPantsy");
					assert.equal(res.body.style.class, "pantsy");
					assert.equal(res.body.style.css.fancy, "ew ew ew");
					done();
				});
		}),
		it('Update the styleset for the test described in the test above', function (done) {
			var styles = [documentStyleId2, documentStyleId3];
			request(host)
				.put('/styleset/' + documentStylesetId1 + '/update')
				.set('cookie', cookie)
				.send({name: "Robotnix", styles: styles})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset._id, documentStylesetId1);
					assert.equal(res.body.styleset.name, "Robotnix");
					assert.equal(res.body.styleset.styles.length, 2);
					assert.equal(res.body.styleset.styles[0], documentStyleId2);
					assert.equal(res.body.styleset.styles[1], documentStyleId3);
					done();
				});
		}),
		it('Verify that changes to the copied (document) style were copied back to the original style, c.f. description above', function (done) {
			request(host)
				.get('/style/' + userStyleId2)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style._id, userStyleId2);
					assert.equal(res.body.style.name, "FancyPantsy");
					assert.equal(res.body.style.class, "pantsy");
					assert.deepEqual(res.body.style.css, css2);
					done();
				});
		}),
		it('Archiving a styleset should return the archived styleset', function (done) {
			request(host)
				.put('/styleset/' + userStylesetId2 + '/archive')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.name, "book-color");
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
					assert.equal(res.body.stylesets[0].name, "book-color");
					done();
				});
		}),
		it('Unarchiving a styleset should return the unarchived styleset', function (done) {
			request(host)
				.put('/styleset/' + userStylesetId2 + '/unarchive')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.styleset.name, "book-color");
					assert.equal(res.body.styleset.archived, false);
					done();
				});
		}),
		it('Archiving a style should return the archived style', function (done) {
			request(host)
				.put('/style/' + documentStyleId1 + '/archive')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style._id, documentStyleId1);
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
					assert.equal(res.body.styles[0]._id, documentStyleId1);
					done();
				});
		}),
		it('Unarchiving a style should return the unarchived style', function (done) {
			request(host)
				.put('/style/' + documentStyleId1 + '/unarchive')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.style._id, documentStyleId1);
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
					assert.notEqual(res.body.project.styleset, userStylesetId1);
					done();
				});
		})
	}),
	describe('Insert', function () {
		it('Getting a ToC (i.e. the DOM structure for each document in a project) should return an array with all documents and their headings and user-defined anchors.', function (done) {
			request(host)
				.get('/project/' + projectId + '/toc')
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					//console.log(res.body.toc);
					assert.equal(res.body.toc.length, 10);
					assert.equal(res.body.toc[0].id, coverDocumentId);
					assert.equal(res.body.toc[0].type, 'document');
					assert.equal(res.body.toc[0].level, 0);
					assert.equal(res.body.toc[0].target, 'Cover.html');
					assert.equal(res.body.toc[0].text, 'Cover');
					assert.equal(res.body.toc[4].id, childDocumentId);
					assert.equal(res.body.toc[4].type, 'document');
					assert.equal(res.body.toc[4].level, 0);
					assert.equal(res.body.toc[4].target, conf.epub.documentPrefix + childDocumentId + ".html");
					assert.equal(res.body.toc[4].text, 'Sikke et dokument');
					assert.equal(res.body.toc[9].id, "id_25");
					assert.equal(res.body.toc[9].type, 'a');
					assert.equal(res.body.toc[9].level, 3);
					assert.equal(res.body.toc[9].target, conf.epub.documentPrefix + jimboDocumentId + ".html#id_25");
					assert.equal(res.body.toc[9].text, 'LinkyDinky');
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
					assert.equal(res.body.project.metadata.coverage, "Asia");
					assert.equal(res.body.project.metadata.relation, "Part 2");
					assert.equal(res.body.project.metadata.source, "Det Gode Bibliotek");
					done();
				});
		}),
		it('Set metadata cover - should return updated project', function (done) { // TODO: Refactor when using PATCH, c.f. #323
			var now = new Date;

			request(host)
				.put('/project/' + projectId + '/metadata/cover')
				.set('cookie', cookie)
				.send({
					cover: "images/frontpage.jpg"
				})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.metadata.cover, "images/frontpage.jpg");
					done();
				});
		}),
		it('Set metadata TOC - should return updated project', function (done) {
			request(host)
				.put('/project/' + projectId + '/toc')
				.set('cookie', cookie)
				.send({entries: [
					{text: "Cover", target: "Cover.html", "level": "0"},
					{text: "Title Page", target: "TitlePage.html", "level": "0"},
					{text: "Table of Contents", target: "ToC.html", "level": "0"},
					{text: "Colophon", target: "Colophon.html", "level": "0"},
					{text: "Document 1", target: conf.epub.documentPrefix + childDocumentId + ".html", "level": "0"},
					{text: "Document 2", target: conf.epub.documentPrefix + jimboDocumentId + ".html", "level": "0"},
					{text: "Introduction", target: conf.epub.documentPrefix + childDocumentId + ".html#" + conf.epub.anchorIdPrefix + "1", "level": "1"},
					{text: "Partey", target: conf.epub.documentPrefix + jimboDocumentId + ".html#" + conf.epub.anchorIdPrefix + "453", "level": "2"},
					{text: "LinkyDinky", target: conf.epub.documentPrefix + jimboDocumentId + ".html#" + conf.epub.anchorIdPrefix + "25", "level": "3"}
				]})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.metadata.title, "Space: From Earth to the Edge of the Universe");
					assert.equal(res.body.project.metadata.authors.length, 3);
					assert.equal(res.body.project.metadata.toc.entries.length, 9);
					assert.equal(res.body.project.metadata.toc.entries[0].text, "Cover");
					assert.equal(res.body.project.metadata.toc.entries[1].text, "Title Page");
					assert.equal(res.body.project.metadata.toc.entries[2].text, "Table of Contents");
					assert.equal(res.body.project.metadata.toc.entries[3].text, "Colophon");
					assert.equal(res.body.project.metadata.toc.entries[4].text, "Document 1");
					assert.equal(res.body.project.metadata.toc.entries[5].text, "Document 2");
					assert.equal(res.body.project.metadata.toc.entries[6].text, "Introduction");
					assert.equal(res.body.project.metadata.toc.entries[7].text, "Partey");
					assert.equal(res.body.project.metadata.toc.entries[8].text, "LinkyDinky");
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
		it('Change user level: free', function(done) {
			user_utils.changeLevel(userId, "free", function (err) {
				if (err) throw new Error(err);
				done();
			});
		}),
		it('Uploading an image larger than the free limit should not be allowed by a free user', function (done) {
			imageName = 'Scripler_logo.jpg';
			var srcImagesDir = path.join('test', 'resources', 'images');
			var srcImage = path.join(srcImagesDir, imageName);

			request(host)
				.post('/image/' + projectId + '/upload')
				.set('cookie', cookie)
				.attach('file', srcImage)
				.expect(402)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Change user level: premium', function(done) {
			user_utils.changeLevel(userId, "premium", function (err) {
				if (err) throw new Error(err);
				done();
			});
		}),
		it('Uploading an image to a project should return the Mongoose model object representing the uploaded image', function (done) {
			imageName = 'Scripler_logo.jpg';
			var srcImagesDir = path.join('test', 'resources', 'images');
			var srcImage = path.join(srcImagesDir, imageName);

			request(host)
				.post('/image/' + projectId + '/upload')
				.set('cookie', cookie)
				.attach('file', srcImage)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.images.length, 1);
					var image = res.body.images[0];
					imageId = image._id;
					var imageRegex = new RegExp("Scripler_logo" + "-\\w+.jpg");
					chai_assert.match(image.name, imageRegex);
					imageName = image.name; // Save the new filename including the Mongoose id
					assert.equal(image.projectId, projectId);
					assert.equal(image.fileExtension, "jpg");
					assert.equal(image.mediaType, "image/jpeg");
					assert.equal(image.members[0].userId, userId);
					assert.equal(image.members[0].access[0], "admin");
					done();
				});
		}),
		it('Uploading an additional image to a project should return should not be allowed (storage restriction for premium user)', function (done) {
			var originalImageName = 'Scripler_logo.jpg';
			var srcImagesDir = path.join('test', 'resources', 'images');
			var srcImage = path.join(srcImagesDir, originalImageName);

			request(host)
				.post('/image/' + projectId + '/upload')
				.set('cookie', cookie)
				.attach('file', srcImage)
				.expect(402)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Opening the project that an image was added to, should return the project with the added image', function (done) {
			request(host)
				.get('/project/' + projectId)
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.images[0], imageId);
					done();
				});
		}),
		it('Opening an uploaded image should return the image but in this case we just test for success', function (done) {
			request(host)
				.get('/project/' + projectId + '/images/' + imageName)
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Attempting to open an uploaded image which the user does not have access to, should return an error', function (done) {
			request(host)
				.get('/project/' + projectId + '/images/' + imageName)
				.expect(401)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Opening a non-existing file should return an error', function (done) {
			request(host)
				.get('/project/' + projectId + '/images/QUBSE')
				.set('cookie', cookie)
				.expect(404)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
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
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");

					// binary response data is in res.body as a buffer
					assert.ok(Buffer.isBuffer(res.body));
					//console.log("res: ", res.body);
					var epub = projectId + '.epub';
					fs.writeFile(epub, res.body);

					child = exec('java -jar test/epubcheck-3.0.1.jar ' + epub,
						function (error, stdout, stderr) {
							console.log('stdout: ' + stdout);
							console.log('stderr: ' + stderr);
							console.log('error: ' + error);

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
			var filename = 'test.docx';
			var filepath = path.join('test', 'resources', 'import', filename);

			request(host)
				.post('/document/'+projectId+'/upload')
				.set('cookie', cookie)
				.attach('file', filepath)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.document.name, filename);
					assert.equal(res.body.document.projectId, projectId);
					//TODO: When we got a proper semi-automated docvert setup on both Windows and Unix, do assertion of imported text!
					//assert.equal(res.body.document.text, '???');
					assert.equal(res.body.document.archived, false);
					assert.equal(res.body.document.members[0].userId, userId);
					assert.equal(res.body.document.members[0].access[0], "admin");
					assert.equal(res.body.document.stylesets.indexOf(res.body.document.defaultStyleset) > -1, true);
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
});
