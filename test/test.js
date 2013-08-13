process.env.NODE_ENV = 'test';

var assert = require("assert")
    , conf = require('config')
    , app = require('../app')
    , mongoose = require('mongoose')
    , request = require('supertest');

var host = 'localhost:'+conf.app.port;
var cookie;
var projectId;
var projectId2;
var projectId3;
var userId;
var folderId;

if (conf.db.uri.match('_test$') === null) {
    console.log("You shouldn't be running this test on any database not being specifically meant for 'test'!");
    console.log("You tried with this database: " + conf.db.uri);
    process.exit(1);
}

describe('Scripler RESTful API', function () {
    before(function (done) {
        //Don't start the tests before the database connection is ready.
        mongoose.connection.on('open', function() {
            done();
        });
    }),
    after(function (done) {
        //Clean database
        mongoose.connection.db.dropDatabase();
        done();
    }),
    describe('/user', function () {
        it('Register a new user should return the user (dummy initialization)', function (done) {
            request(host)
                .post('/user/register')
                .send({name: "Dummy Doe", email: "dummy@doe.com", password: "abc"})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.user.name, "Dummy Doe");
                    done();
                });
        }),
        it('Registering a new user should return the user', function (done) {
            request(host)
                .post('/user/register')
                .send({name: "John Doe", email: "john@doe.com", password: "abc"})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.user.name, "John Doe");
                    done();
                });
        }),
        it('Login should return current user', function (done) {
            request(host)
                .post('/user/login')
                .send({email: "john@doe.com", password: "abc"})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    cookie = res.headers['set-cookie'];
                    assert.equal(res.body.user.name, "John Doe");
                    userId = res.body.user._id;
                    done();
                });
        }),
        it('Return current user', function (done) {
            request(host)
                .get('/user')
                .set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.user.name, "John Doe");
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
    describe('/project', function () {
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
                .expect(403)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.errorMessage, "User not authenticated");
                    done();
                });
        }),
        it('Opening a project should return the project', function (done) {
            request(host)
                .get('/project/'+projectId)
                .set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.project.name, "The Wizard of Oz");
                    done();
                });
        }),
        it('Creating a copy of a project should return the new project', function (done) {
            request(host)
                .post('/project/'+projectId+'/copy')
                .set('cookie', cookie)
                .send({})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.project.name, "The Wizard of Oz - Copy");
                    assert.equal(res.body.project.archived, false);
                    projectId3 = res.body.project._id;
                    done();
                });
        }),
        it('Renaming a project should return the project', function (done) {
            request(host)
                .put('/project/'+projectId3+'/rename')
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
                .put('/project/'+projectId3+'/archive')
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
        it('Project list should return the two unarchived projects in creation order', function (done) {
            request(host)
                .get('/project/list')
                .set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.projects.length, 2);
                    assert.equal(res.body.projects[0].name, "The Wizard of Oz");
                    assert.equal(res.body.projects[1].name, "A Nice Story");
                    done();
                });
        }),
        it('List of archived projects should return the single archived project', function (done) {
            request(host)
                .get('/project/archived')
                .set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.projects.length, 1);
                    assert.equal(res.body.projects[0].name, "A New Name");
                    done();
                });
        }),
        it('Rearraning projects should return project list in the new order ', function (done) {
            request(host)
                .put('/project/rearrange')
                .set('cookie', cookie)
                .send({projects:[projectId2, projectId]})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.projects.length, 2);
                    assert.equal(res.body.projects[0].name, "A Nice Story");
                    assert.equal(res.body.projects[1].name, "The Wizard of Oz");
                    done();
                });
        }),
        it('Unarchiving a project should return the unarchived project', function (done) {
            request(host)
                .put('/project/'+projectId3+'/unarchive')
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
        it('List of archived projects should return no projects', function (done) {
            request(host)
                .get('/project/archived')
                .set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.projects.length, 0);
                    done();
                });
        }),
        it('Project list should return the three unarchived projects in order', function (done) {
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
                .del('/project/'+projectId3)
                .set('cookie', cookie)
                .send({})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    done();
                });
        })
    }),
    describe('/document', function () {
        it('creating a document should return the new document', function (done) {
            request(host)
                .post('/document')
                .set('cookie', cookie)
                .send({projectId: projectId, name: 'MyFirstDocument', text: 'It is my best document ever!'})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.document.name, 'MyFirstDocument');
                    assert.equal(res.body.document.projectId, projectId);
                    assert.equal(res.body.document.text, 'It is my best document ever!');
                    assert.equal(res.body.document.archived, false);
                    assert.equal(res.body.document.members[0].userId, userId);
                    assert.equal(res.body.document.members[0].access[0], "admin");
                    res.body.document._id && done();
                });
        })
    }),
    describe('/folder', function () {
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
                    folderId = res.body.folder._id; 
                    folderId && done();
                });
        }),
        it('Creating a folder with a parent folder should return the new folder as an empty child folder of the parent', function (done) {
            request(host)
                .post('/folder')
                .set('cookie', cookie)
                .send({projectId: projectId, name: 'Chapter 1 - images', parentFolderId: folderId})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.folder.name, 'Chapter 1 - images');
                    assert.equal(res.body.folder.folders.length, 0);
                    res.body.folder._id && done();
                });
        })
    }),
    describe('/project', function () {
        it('opening the project should now return one root folder (but not the child folder)', function (done) {
            request(host)
                .get('/project/'+projectId)
                .set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.project.folders.length, 1);
                    done();
                });
        }),
    	it('deleting a project should return success', function (done) {
            request(host)
                .del('/project/'+projectId)
                .set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    done();
                });
        })
    })
})