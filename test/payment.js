process.env.NODE_ENV = 'test';

require('./it'); // Ensure that this is run after it.js

var assert = require("assert")
	, conf = require('config')
	, app = require('../app')
	, mongoose = require('mongoose')
	, request = require('supertest')
	, fs = require('fs')
	, url = require('url')
	, path = require('path')
	, moment = require('moment')
	, utils = require('../public/create/scripts/utils-shared')
	, font_utils = require('../lib/font-utils')
	, Font = require('../models/font.js').Font;

var exec = require('child_process').exec,
	child;

var host = '127.0.0.1:' + conf.app.port;
var cookie;

var userId;

var projectId;
var documentId;

var text;

var defaultUserStyleset;
var userStylesetId1;
var userStylesetId2;
var userStylesetId3;
var userStylesetId4;

if (conf.db.uri.match(/_test(\?|$)/) === null) {
	console.log("You shouldn't be running this test on any database not being specifically meant for 'test'!");
	console.log("You tried with this database: " + conf.db.uri);
	process.exit(1);
}

describe('Scripler - Payment', function () {
	describe('Frontpage (/user)', function () {
		it('Registering a new user should return the user', function (done) {
			request(host)
				.post('/user/register')
				.send({name: "John The Payer", email: "john@payer.com", password: "987654"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.user.firstname, "John");
					assert.equal(res.body.user.lastname, "The Payer");
					assert.equal(res.body.user.stylesets.length, 17);
					userStylesetId1 = res.body.user.stylesets[0]; // book-bw - Free
					userStylesetId2 = res.body.user.stylesets[1]; // book-color - Free
					userStylesetId3 = res.body.user.stylesets[2]; // draft-bw - Premium
					userStylesetId4 = res.body.user.stylesets[3]; // draft-color - Premium
					defaultUserStyleset = res.body.user.stylesets[15]; // simple-bw
					done();
				});
		}),
		it('Login should return current user', function (done) {
			request(host)
				.post('/user/login')
				.send({email: "john@payer.com", password: "987654"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					cookie = res.headers['set-cookie'];
					assert.equal(res.body.user.firstname, "John");
					assert.equal(res.body.user.lastname, "The Payer");
					userId = res.body.user._id;
					done();
				});
		}),
		it('Creating a project should return the new project ', function (done) {
			request(host)
				.post('/project')
				.set('cookie', cookie)
				.send({name: "Mega Shark Versus Giant Octopus"})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.project.name, "Mega Shark Versus Giant Octopus");
					assert.equal(res.body.project.styleset, defaultUserStyleset);
					projectId = res.body.project._id;
					done();
				});
		}),
		it('Creating a document should return the document', function (done) {
			var text = '<p>This copying logic is going to be the end of us!</p>';

			request(host)
				.post('/document')
				.set('cookie', cookie)
				.send({
					projectId: projectId,
					name: 'Chapter 1',
					text: text
				})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					documentId = res.body.document._id;
					documentId && done();
				});
		}),
		it('Get all stylesets, and some premium ones should not be available', function (done) {
			request(host)
				.get('/document/' + documentId + '/stylesets')
				.set('cookie', cookie)
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.stylesets.length, 17);
					assert.equal(res.body.stylesets[0]._id, userStylesetId1);
					assert.equal(res.body.stylesets[1]._id, userStylesetId2);
					assert.equal(res.body.stylesets[2]._id, userStylesetId3);
					assert.equal(res.body.stylesets[3]._id, userStylesetId4);
					assert.equal(res.body.stylesets[0].accessLevels.indexOf("free") >= 0, true);
					assert.equal(res.body.stylesets[1].accessLevels.indexOf("free") >= 0, true);
					assert.equal(res.body.stylesets[2].accessLevels.indexOf("free") >= 0, false);
					assert.equal(res.body.stylesets[3].accessLevels.indexOf("free") >= 0, false);
					done();
				});
		}),
		it('Applying a non-premium styleset to a document should be allowed.', function (done) {
			request(host)
				.put('/styleset/' + userStylesetId2 + "/document/" + documentId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Applying a premium styleset to a document should not be allowed without payment or a premium account.', function (done) {
			request(host)
				.put('/styleset/' + userStylesetId3 + "/document/" + documentId)
				.set('cookie', cookie)
				.send({})
				.expect(402)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Paying for a specific premium styleset should return success.', function (done) {
			request(host)
				.post('/payment/transaction/styleset/' + userStylesetId3)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					assert.equal(res.body.numberAffected, 1);// Only the user styleset
					done();
				});
		}),
		it('Paying for an already paid for premium styleset should return error.', function (done) {
			request(host)
				.post('/payment/transaction/styleset/' + userStylesetId3)
				.set('cookie', cookie)
				.send({})
				.expect(594)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Applying the premium styleset to a document should be allowed after payment.', function (done) {
			request(host)
				.put('/styleset/' + userStylesetId3 + "/document/" + documentId)
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Applying a premium styleset to a document should still not be allowed without payment or a premium account.', function (done) {
			request(host)
				.put('/styleset/' + userStylesetId4 + "/document/" + documentId)
				.set('cookie', cookie)
				.send({})
				.expect(402)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Subscribing to premium account should return success.', function (done) {
			request(host)
				.post('/payment/subscription')
				.set('cookie', cookie)
				.send({})
				.expect(200)
				.end(function (err, res) {
					if (err) throw new Error(err + " (" + res.body.errorMessage + ")");
					done();
				});
		}),
		it('Applying the premium styleset to a document should be allowed after becoming a premium subscriber.', function (done) {
			request(host)
				.put('/styleset/' + userStylesetId4 + "/document/" + documentId)
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
