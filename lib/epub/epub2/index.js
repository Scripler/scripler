var conf = require('config');
var path = require('path');
var archiver = require('archiver');

var appDir = path.dirname(__dirname);
var templateDir = path.join(appDir, "epub2", "template");
var archive = archiver('zip', {zlib: {level: 9}});

var epub = require('../');

exports.create = function create(userId, project) {
	return epub.create('epub2', userId, project, archive, templateDir, conf.epub2.oepbsDir, undefined);
}

archive.on('error', function (err) {
	throw err;
});
