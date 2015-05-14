var conf = require('config');
var logger = require('../lib/logger');
var Styleset = require('../models/styleset.js').Styleset;
var path = require('path');
var fs = require('fs');
var ps = require('ps-node');
var env = process.env.NODE_ENV;

exports.status = function (req, res, next) {

	// Check database connection, and whether stylesets has been loaded
	Styleset.findOne({"name": "light-color", "isSystem": true}).exec(function (err, styleset) {
		if (err) {
			return next(err);
		}
		if (!styleset) {
			return next("Styleset 'light-color' not found!");
		}
		var epubjsReadme = path.join('public', 'reader', 'epubjs', 'README.md');

		// Check that submodules have been loaded (check epujs submodule)
		fs.readFile(epubjsReadme, function (err, data) {
			if(err) {
				return next(err);
			}
			if (!data) {
				return next("EpubJS README.md could not be found. Have submodules been loaded?");
			}
			if (data.length <= 0) {
				return next("EpubJS README.md looks empty. Have submodules been loaded?");
			}

			// Check that important processes are running (Production only)
			if (env === "production") {
				ps.lookup({
					command:   "(icinga2|perl|soffice.bin)",
					arguments: "(icinga2|munin-node|headless)",
					psargs:    'aux'
				}, function (err, resultList) {
					if (err) {
						return next(err);
					}
					if (resultList.length == 3) {
						return res.send("OK");
					} else {
						return next('Invalid prcoesslist: ' + JSON.stringify(resultList));
					}

				});
			} else {
				return res.send("OK");
			}
		});
	});
}
