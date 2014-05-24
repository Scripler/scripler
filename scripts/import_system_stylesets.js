var fs = require('fs');
var path = require('path');
var cssparser = require("cssparser");
var parser = new cssparser.Parser();
var mongoose = require('mongoose');
var conf = require('config');
var async = require('async');
var Styleset = require('../models/styleset.js').Styleset;
var Style = require('../models/style.js').Style;

function toInternalJSON(json) {
	var internalJSON;
	var ruleList = json['rulelist'];
	//console.log(JSON.stringify(ruleList, null, '\t'));
	internalJSON = ruleList;
	return internalJSON;
}

function createStyle(json, styleset, callback) {
	var internalJSONStyle = toInternalJSON(json);
	console.log("internalJSONStyle: " + JSON.stringify(internalJSONStyle, null, '\t') + "\n");

	/**
	 * if name is ~@font-face, skip
	 *
	 * tag:
	 *
	 * class: .<name>
	 *
	 * @type {string}
	 */

	var name = 'style';
	var clazz = 'clazz';
	var tag = 'tag';

	var style = new Style({
		name: name,
		class: clazz,
		css: css,
		tag: tag,
		stylesetId: styleset._id,
		isSystem: true
	});

	style.save(function (err, style) {
		if (err) {
			callback(err);
		}

		styleset.styles.addToSet(style);
		callback(null, style);
	});
}

function createStyleset(stylesheetName, jsonStyles, next) {
	var styleset = new Styleset({
		name: stylesheetName,
		isSystem: true
	});

	styleset.save(function (err, styleset) {
		if (err) {
			return next(err);
		}

		async.each(jsonStyles, function (jsonStyle, callback) {
			createStyle(jsonStyle, styleset, callback);
		}, function (err) {
			if (err) {
				return next(err);
			}

			styleset.save(function (err, styleset) {
				if (err) {
					return next(err);
				}

				return next(null, styleset);
			});

		});
	});
}

var stylesheetName = 'simplecolor';
var cssFilename = path.join(__dirname, '../public/create/stylesets/' + stylesheetName + '.css');
console.log(cssFilename);

var css = fs.readFileSync(cssFilename, 'utf8');
//console.log(css);

var json = parser.parse(css);
//console.log("JSON:\n " + JSON.stringify(json, null, '\t'));

mongoose.connect(conf.db.uri);

createStyleset(stylesheetName, json, function (err, styleset) {
	if (err) {
		console.log(err);
	}

	console.log('Created and saved styleset ' + styleset);
});