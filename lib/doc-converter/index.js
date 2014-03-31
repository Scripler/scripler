var spawn = require('child_process').spawn;
var fs = require('fs');

var converter = (function () {
	this.execute = function (imageDir, document, callback) {
		var buffer = '';
		var error = '';

		if (!callback) {
			throw new Error('No callback provided');
		}

		//Windows is not supported
		if (process.platform === "win32") {
			callback(error, '<p>Hello Scripler</p>');
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
	return this;
})();

module.exports = converter;
