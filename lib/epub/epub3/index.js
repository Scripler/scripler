var conf = require('config');
var fs = require('fs');
var path = require('path');
var project_utils = require('../../../lib/project-utils');

var appDir = path.dirname(__dirname);
var templateDir = path.join(appDir, "epub3", "template");

var archiver = require('archiver');
var epub = require('../');

var getTocString = exports.getTocString = function (tocEntries) {
	var tocString = '';
	var tocEntryString = '        <li><a href="%target%">%text%</a></li>\r\n';

	if (tocEntries != null && tocEntries.length > 0) {
		var tocEntryValuesInserted = '';
		for (var i = 0; i < tocEntries.length; i++) {
			var tocEntry = tocEntries[i];
			tocEntryValuesInserted = tocEntryString.replace("%target%", conf.epub.htmlDir + '/' + tocEntry.target).replace("%text%", tocEntry.text);
			tocString += tocEntryValuesInserted;
		}
	}

	return tocString;
}

var getLandmarkString = exports.getLandmarkString = function getLandmarkString(type, documents) {
	var landmarkString = '';

	for (var i = 0; i < documents.length; i++) {
		var document = documents[i];

		if (project_utils.includeInEbook(document)) {
			var documentTypeName = project_utils.getDocumentTypeName(type);
			var documentTypeTitle = project_utils.getDocumentTypeTitle(type);

			if (document.type == type) {
				landmarkString = '<li><a epub:type="' + type + '" href="' + conf.epub.htmlDir + '/' + documentTypeName + '.html">' + documentTypeTitle + '</a></li>';
				break; // Only one of each of the system types is allowed per ebook
			}
		}
	}

	return landmarkString;
}

function createNav(toc, documents, archive, callback) {
	var navFilename = 'nav.xhtml';
	var navTemplateFilename = path.join(templateDir, conf.epub3.epubDir, navFilename);
	var navFileReadStream = fs.createReadStream(navTemplateFilename);

	var tocString = getTocString(toc.entries);

	// Removed because it breaks Kindle Direct Publishing validation (#986).
	// When we start producing Mobi, re-add it because Amazon's "EPUB to Mobi" commandline tool, KindleGen, *should* handle removing it.
	//var landmarkCoverString = getLandmarkString('cover', documents);
	var landmarkTitlePageString = getLandmarkString('titlepage', documents);
	var landmarkToCString = getLandmarkString('toc', documents);
	var landmarkColophonString = getLandmarkString('colophon', documents);

	navFileReadStream.setEncoding('utf8');
	navFileReadStream.on('data', function (navData) {
		navData = navData.replace("%toc%", tocString).
			//replace("%landmark_cover%", landmarkCoverString).
			replace("%landmark_titlepage%", landmarkTitlePageString).
			replace("%landmark_toc%", landmarkToCString).
			replace("%landmark_colophon%", landmarkColophonString);
		archive.append(navData, { name: path.join(conf.epub3.epubDir, navFilename), store: false });
	});

	navFileReadStream.on('error', function (err) {
		console.log('createNav: ' + err);
		callback(err);
	});

	navFileReadStream.on('end', function () {
		callback(null);
	});
}

exports.create = function create(userId, project, next) {
	var archive = archiver('zip', {zlib: {level: 9}});
	epub.create('epub3', userId, project, archive, templateDir, conf.epub3.epubDir, createNav, function (err, epub) {
		if (err) {
			return next(err);
		}

		return next(null, epub);
	});
}

