var spawn = require('child_process').spawn;
var fs = require('fs');
var logger = require('../../lib/logger');
var env = process.env.NODE_ENV;

var converter = (function () {
	var converter = {};
	converter.execute = function (imageDir, document, callback) {
		var buffer = '';
		var error = '';

		if (!callback) {
			var errorMessage = 'No callback provided';
			logger.error(errorMessage);
			throw new Error(errorMessage);
		}

		//Windows is not supported
		if (process.platform === "win32" || env === "test") {
			callback(error, '<h1>Heading1</h1><p>Hello</p><h2 otherattribute="hmm">Heading2</h2><p>You</p><h3 name="_toc13" id="_toc13">Heading3</h3><p>Little World</p>');
			return;
		}

		var docvert = spawn('/usr/bin/python3', [
			'docvert/docvert-scripler.py',
			'--imagedir', imageDir,
			'--pipeline', 'scripler',
			'--autopipeline', 'scripler',
			document
		], {cwd: __dirname});
		var tidy = spawn('/usr/bin/tidy', [
			'-m', '-q',
			'-config', 'tidy_options.conf'
		], {cwd: __dirname});
		docvert.stdout.on('data', function (data) {
			tidy.stdin.write(data);
		});

		docvert.stderr.on('data', function (data) {
			error += data;
		});

		docvert.on('close', function (code, signal) {
			if (tidy != 0) {
				console.log('Docvert failed with exit code: ' + code);
			}
			tidy.stdin.end();
		});

		tidy.stdout.on('data', function (data) {
			buffer += data;
		});

		tidy.stderr.on('data', function (data) {
			error += data;
		});

		tidy.on('close', function (code, signal) {
			if (code != 0) {
				console.log('Tidy failed with exit code: ' + code);
			}
			console.log('Error buffer: ' + error);
			callback(error, buffer);
		});
	}
	return converter;
})();

module.exports = converter;
