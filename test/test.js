process.env.NODE_ENV = 'test';

var assert = require("assert")
    , conf = require('config')
    , app = require('../app')
    , mongoose = require('mongoose')
    , request = require('supertest');

var host = 'localhost:'+conf.app.port;
var cookie;
var projectId;
var userId;
var folderId;
var documentId;

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
        it('register user should return user (dummy initialization)', function (done) {
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
        it('register user should return user', function (done) {
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
        it('login should return current user', function (done) {
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
        it('should return current user', function (done) {
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
        it('invalid login password should return error', function (done) {
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
        it('invalid login email should return error', function (done) {
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
        it('creating a project should return the new project - 1', function (done) {
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
        it('creating a project should return the new project - 2', function (done) {
            request(host)
                .post('/project')
                .set('cookie', cookie)
                .send({name: "A Nice Story"})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.project.name, "A Nice Story");
                    done();
                });
        }),
        it('project list should return two projects', function (done) {
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
        it('project list without session should return unauthorized', function (done) {
            request(host)
                .get('/project/list')
                .expect(403)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.errorMessage, "User not authenticated");
                    done();
                });
        }),
        it('opening a project should return the project', function (done) {
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
        it('getting options from project should return the project', function (done) {
            request(host)
                .get('/project/'+projectId+'/options')
                .set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.project.name, "The Wizard of Oz");
                    done();
                });
        }),
        it('creating a copy of a project should return the new project', function (done) {
            request(host)
                .post('/project/'+projectId+'/copy')
                .set('cookie', cookie)
                .send({})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.project.name, "The Wizard of Oz - Copy");
                    assert.equal(res.body.project.archived, false);
                    projectId = res.body.project._id;
                    done();
                });
        }),
        it('renaming a project should return the project', function (done) {
            request(host)
                .put('/project/'+projectId+'/rename')
                .set('cookie', cookie)
                .send({name: "A New Name"})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.project.name, "A New Name");
                    done();
                });
        })
    }),
    describe('/folder', function () {
        it('creating a folder without a parent should return the new folder as an empty root folder', function (done) {
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
        it('creating a folder with a parent folder should return the new folder as an empty child folder of the parent', function (done) {
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
        }),
        it('renaming a folder should return the folder', function (done) {
            request(host)
                .put('/folder/'+folderId+'/rename')
                .set('cookie', cookie)
                .send({projectId: projectId, name: "A New Fine Name"})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.folder.name, "A New Fine Name");
                    done();
                });
        })
    }),
    describe('/document', function () {
    	it('creating a document (in the root folder) should return the new document', function (done) {
            request(host)
                .post('/document')
                .set('cookie', cookie)
                .send({projectId: projectId, folderId: folderId, name: 'MyFirstDocument', text: 'It is my best document ever!'})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    document = res.body.document;
                    assert.equal(res.body.document.name, 'MyFirstDocument');
                    assert.equal(res.body.document.projectId, projectId);
                    assert.equal(res.body.document.folderId, folderId);
                    assert.equal(res.body.document.text, 'It is my best document ever!');
                    assert.equal(res.body.document.archived, false);
                    assert.equal(res.body.document.members[0].userId, userId);
                    assert.equal(res.body.document.members[0].access[0], "admin");
                    documentId = res.body.document._id;
                    documentId && done();
                });
        }),
        it('renaming a document should return the document', function (done) {
            request(host)
                .put('/document/'+documentId+'/rename')
                .set('cookie', cookie)
                .send({name: "A New Cool Name"})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.document.name, "A New Cool Name");
                    done();
                });
        })
    }),
    describe('/folder', function () {
        it('opening the root folder should return the folder contents: one child folder and one document', function (done) {
            request(host)
                .get('/folder/'+projectId+'/'+folderId)
                .set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.result.folders.length, 1);
                    assert.equal(res.body.result.docs.length, 1);
                    done();
                });
        })
    }),
    describe('/document', function () {
        it('archiving a document should return the archived document', function (done) {
            request(host)
                .put('/document/'+documentId+'/archive')
                .set('cookie', cookie)
                .send({})
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    assert.equal(res.body.document.archived, true);
                    done();
                });
        }),
    	it('deleting a document should return success', function (done) {
            request(host)
                .del('/document/'+documentId)
                .set('cookie', cookie)
                .expect(200)
                .end(function (err, res) {
                    if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
                    done();
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
        it('archiving a project should return the archived project', function (done) {
            request(host)
                .put('/project/'+projectId+'/archive')
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