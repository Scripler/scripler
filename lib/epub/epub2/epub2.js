var express = require('express');
var Project = require('../../../models/project.js').Project;
var path = require('path');
var archiver = require('archiver');
var fs = require('fs');
var filewalker = require('filewalker');
var moment = require('moment');
var conf = require('config');
var uuid_lib = require('node-uuid');
var async = require('async');

var appDir = path.dirname(__dirname);
var templateDir = path.join(appDir, "epub2", "template");

var archive = archiver('zip', {zlib: {level: 9}});

archive.on('error', function(err) {
	throw err;
});

// TODO: is there a better way to do this?
function getMediaType(fileExtension) {
	var mediaTypes = {
		"html"	: "application/xhtml+xml",
		"jpg"	: "image/jpeg",
		"png"	: "image/jpeg",
		"ttf"	: "application/x-font-ttf"
	};

	return mediaTypes[fileExtension];
}

// Copied from http://stackoverflow.com/questions/10865347/node-js-get-file-extension
function getFileExtension(filename) {
	var ext = path.extname(filename || '').split('.');
	return ext[ext.length - 1];
}

function isSystemType(type) {
	return type == 'Cover' || type == 'TitlePage' || type == 'ToC' || type == 'Colophon';
}

function getStylesheet() {
	var css = ''; // TODO: get stylesheet from db
	return css;
}

var getCloseNavPointsString = exports.getCloseNavPointsString = function (currentLevel, previousLevel) {
    var closeNavPointsString = '';

    var numberOfNavPoints = previousLevel - currentLevel;
    for (var i=0; i<=numberOfNavPoints; i++) {
        closeNavPointsString += '</navPoint>';
    }

    return closeNavPointsString;
}

var getNavPointsString = exports.getNavPointsString = function (tocEntries) {
    var navPointsString = '';
    var navPointEntry =     '<navPoint id="navpoint-%playorder%" playOrder="%playorder%">' +
								'<navLabel>' +
									'<text>%text%</text>' +
								'</navLabel>' +
								'<content src="%contentFileName%"/>';

	if (tocEntries != null && tocEntries.length > 0) {
		var navPointEntryValuesInserted = '';
		var previousLevel = null;
		var tocEntry = null;
		for (var i=0; i<tocEntries.length; i++) {
			tocEntry = tocEntries[i];

			// On our way up => close the appropriate number of navPoints
			if (previousLevel != null && previousLevel >= tocEntry.level) {
				if (previousLevel - tocEntry.level > 1) {
					throw "Could not jump " + (previousLevel - tocEntry.level) + " levels generating navigation points";
				}
				navPointsString += getCloseNavPointsString(tocEntry.level, previousLevel);
			}

			// Always just create the navPoint (expect the previous iteration to have closed the appropriate navPoints)
			navPointEntryValuesInserted = navPointEntry.replace(/%playorder%/g, i+1).replace("%text%", tocEntry.title).replace("%contentFileName%", tocEntry.target);
			navPointsString += navPointEntryValuesInserted;

			previousLevel = tocEntry.level;
		}

		navPointsString += getCloseNavPointsString(0, previousLevel);
	}

    return navPointsString;
}

var getManifestFilesString = exports.getManifestFilesString = function (prefix, folderName, manifestFiles) {
	var manifestFilesString = '';
	if (manifestFiles != null && manifestFiles.length > 0) {
		for (var i=0; i<manifestFiles.length; i++) {
			var manifestFile = manifestFiles[i];

			var id = manifestFile.id;
			var type = manifestFile.type;
			var name = manifestFile.name; // manifestFile.toString() ?
			var fileExtension = manifestFile.fileExtension;
			var mediaType = manifestFile.mediaType;

			if (isSystemType(type)) {
				manifestFilesString += '<item id="' + type + '.' + fileExtension + '" href="' + folderName + '/' + type + '.' + fileExtension + '" media-type="' + mediaType + '" />';
			} else if (folderName == 'Images' || folderName == 'Fonts') { // TODO: make this check prettier!
				manifestFilesString += '<item id="' + name + '" href="' + folderName + '/' + name + '" media-type="' + mediaType + '" />';
			} else {
				manifestFilesString += '<item id="' + prefix + id + '.' + fileExtension + '" href="' + folderName + '/' + prefix + id + '.' + fileExtension + '" media-type="' + mediaType + '" />';
			}
		}
	}
	return manifestFilesString;
}

var getSpineDocumentsString = exports.getSpineDocumentsString = function (prefix, htmlFiles, fileExtension) {
	var spineDocumentsString = '';
	if (htmlFiles != null && htmlFiles.length > 0) {
		for (var i=0; i<htmlFiles.length; i++) {
			var htmlFile = htmlFiles[i];

			if (isSystemType(htmlFile.type)) {
				spineDocumentsString += '<itemref idref="' + htmlFile.type + '.' + fileExtension + '" />';
			} else {
				spineDocumentsString += '<itemref idref="' + prefix + htmlFile.id + '.' + fileExtension + '" />';
			}
		}
	}
	return spineDocumentsString;
}

function createMimeType(callback) {
	var mimetypeFilename = 'mimetype';
	var mimetypeTemplateFilename = path.join(templateDir, mimetypeFilename);
	var mimeTypeReadStream = fs.createReadStream(mimetypeTemplateFilename);
	archive.append(mimeTypeReadStream, { name: mimetypeFilename, store: true });
	callback(null);
}

function createMetaInf(callback) {
	var dirName = 'META-INF';

	var containerFilename = 'container.xml';
	var containerTemplateFilename = path.join(templateDir, dirName, containerFilename);
	var containerFileReadStream = fs.createReadStream(containerTemplateFilename);
	archive.append(containerFileReadStream, { name: path.join(dirName, containerFilename), store: false });

	var iBooksFilename = 'com.apple.ibooks.display-options.xml';
	var iBooksTemplateFilename = path.join(templateDir, dirName, iBooksFilename);
	var iBooksFileReadStream = fs.createReadStream(iBooksTemplateFilename);
	archive.append(iBooksFileReadStream, { name: path.join(dirName, iBooksFilename), store: false });
	callback(null);
}

function createStylesheet(oepbsDir, callback) {
	var stylesheetFilename = "stylesheet.css";
	var stylesheet = getStylesheet();
	archive.append(stylesheet, { name: path.join(oepbsDir, stylesheetFilename), store: false });
	callback(null);
}

function createHTML(oepbsDir, htmlDir, docPrefix, documents, callback) {
	for (var i=0; i<documents.length; i++) {
		var document = documents[i];

		var documentName;
		if (isSystemType(document.type)) {
			documentName = document.type + ".html";
		} else {
			documentName = docPrefix + document.id + ".html";
		}

		var documentFilename = path.join(oepbsDir, htmlDir, documentName);
		archive.append(document.text, { name: documentFilename, store: false });
	}
	callback(null);
}

function createContentOpf(oepbsDir, htmlDir, docPrefix, imgPrefix, fontPrefix, documents, images, fonts, title, authors, language, cover, isbn, uuid, keywords, description, rights, publicationDate, type, contributors, publisher, coverage, relation, source, callback) {
	var contentOpfFilename = 'content.opf';
	var contentOpfTemplateFilename = path.join(templateDir, oepbsDir, contentOpfFilename);
	var contentOpfFileReadStream = fs.createReadStream(contentOpfTemplateFilename);

	var manifestHtmlFilesString = getManifestFilesString(docPrefix, 'HTML', documents);
	var manifestImageFilesString = getManifestFilesString(imgPrefix, 'Images', images);
	var manifestFontFilesString = getManifestFilesString(fontPrefix, 'Fonts', fonts);

	var manifestFontLicenseName = 'Scripler-license.txt';
	var manifestFontLicenseFilename = path.join(templateDir, manifestFontLicenseName);
	var manifestFontLicenseReadStream = fs.createReadStream(manifestFontLicenseFilename);
	archive.append(manifestFontLicenseReadStream, { name: path.join(oepbsDir, manifestFontLicenseName), store: false });

	var spineDocumentsString = getSpineDocumentsString('doc_', documents, 'html');
	var guideCoverString = '<reference href="' + htmlDir + '/Cover.html" title="Cover" type="cover" />';
	var guideTitlePageString = '<reference href="' + htmlDir + '/TitlePage.html" title="Title Page" type="title-page" />';
	var guideColophonString = '<reference href="' + htmlDir + '/Colophon.html" title="Colophon" type="colophon" />';
	var guideToCString = '<reference href="' + htmlDir + '/ToC.html" title="Table of Contents" type="toc" />';

	var authorString = '';
	for (var i=0; i<authors.length; i++) {
		var author = authors[i];
		authorString += '<dc:creator opf:role="aut">' + author + '</dc:creator>';
	}

	var keywordString = '';
	for (var i=0; i<keywords.length; i++) {
		var keyword = keywords[i];
		keywordString += '<dc:subject>' + keyword + '</dc:subject>';
	}

	var contributorString = '';
	for (var i=0; i<contributors.length; i++) {
		var contributor = contributors[i];
		contributorString += '<dc:contributor opf:role="' + contributor.role + '">' + contributor.name + '</dc:contributor>';
	}

	contentOpfFileReadStream.setEncoding('utf8');
	contentOpfFileReadStream.on('data', function (contentOpfData) {
		contentOpfData = contentOpfData.
			replace("%metadata_uuid%", uuid).
			replace("%metadata_isbn%", isbn).
			// TODO: do we need a URI identifier?
			replace("%metadata_title%", title).
			replace("%metadata_description%", description).
			replace("%metadata_creators%", authorString).
			replace("%metadata_subjects%", keywordString).
			replace("%metadata_language%", language).
			replace("%metadata_modification_date%", moment().format("YYYY-MM-DD")).
			replace("%metadata_publication_date%", publicationDate.format("YYYY-MM-DD")).
			replace("%metadata_type%", type).
			replace("%metadata_rights%", rights).
			replace("%metadata_contributors%", contributorString).
			replace("%metadata_publisher%", publisher).
			replace("%metadata_format%", "book").
			replace("%metadata_cover%", cover).
			replace("%metadata_coverage%", coverage).
			replace("%metadata_relation%", relation).
			replace("%metadata_source%", source).
			// Manifest
			replace("%manifest_html_files%", manifestHtmlFilesString).
			replace("%manifest_image_files%", manifestImageFilesString).
			replace("%manifest_font_files%", manifestFontFilesString).
			replace(/%manifest_font_license_name%/g, manifestFontLicenseName).
			// Spine
			replace("%spine_documents%", spineDocumentsString).
			// Guide
			replace("%guide_cover%", guideCoverString).
			replace("%guide_title-page%", guideTitlePageString).
			replace("%guide_colophon%", guideColophonString).
			replace("%guide_toc%", guideToCString);
		archive.append(contentOpfData, { name: path.join(oepbsDir, contentOpfFilename), store: false });
	});

	contentOpfFileReadStream.on('error', function (err) {
		console.log('createContentOpf: ' + err);
		throw err;
	});

	contentOpfFileReadStream.on('end', function () {
		callback(null);
	});
}

function createToC(oepbsDir, toc, uuid, title, authors, callback) {
	var tocFilename = 'toc.ncx';
	var tocTemplateFilename = path.join(templateDir, oepbsDir, tocFilename);
	var tocFileReadStream = fs.createReadStream(tocTemplateFilename);

	var navpoints = getNavPointsString(toc.entries);

	tocFileReadStream.setEncoding('utf8');
	tocFileReadStream.on('data', function (tocData) {
		tocData = tocData.replace("%uuid%", uuid).
			replace("%title%", title).
			// TODO: handle multiple authors how?
			replace("%author%", authors).
			replace("%navpoints%", navpoints);
		archive.append(tocData, { name: path.join(oepbsDir, tocFilename), store: false });
	});

	tocFileReadStream.on('error', function (err) {
		console.log('createToC: ' + err);
		throw err;
	});

	tocFileReadStream.on('end', function () {
		callback(null);
	});
}

function finalizeArchive(callback) {
	archive.finalize(function(err, bytes) {
		if (err) {
			throw err;
		}
	});
}

exports.create = function create (userId, project) {
	var documents = project.documents;

	var metadata = project.metadata;
	var uuid = uuid_lib.v4();
	var isbn = metadata.isbn;
	var title = metadata.title;
	var description = metadata.description;
	var authors = metadata.authors;
	var keywords = metadata.keywords;
	var language = metadata.language;
	var publicationDate = moment(metadata.publicationDate);
	var type = metadata.type;
	var rights = metadata.rights;
	var contributors = metadata.contributors;
	var publisher = metadata.publisher;
	var cover = metadata.cover;
	var coverage = metadata.coverage;
	var relation = metadata.relation;
	var source = metadata.source;
	var toc = metadata.toc;

	// TODO: should fileExtension and mediaType be added to the model?
	for (var i=0; i<documents.length; i++) {
		var document = documents[i];
		document.fileExtension = 'html';
		document.mediaType = 'application/xhtml+xml';
	}

	var userDir = path.join(conf.resources.usersDir, conf.epub.userDirPrefix + userId);
	var oepbsDir = 'OEBPS';
	var htmlDir = 'HTML';

	// Filenames are not allowed to start with e.g. numbers (c.f.: http://code.google.com/p/epubcheck/issues/detail?id=193) which is typically the case for Mongo ids
	var docPrefix = 'doc_';
	var imgPrefix = 'img_';
	var fontPrefix = 'font_';

	var images = [];
	var fonts = [];

	async.series([
		// Create mimetype file
		function (callback) {
			createMimeType(callback);
		},

		// Create META-INF dir
		function (callback) {
			createMetaInf(callback);
		},

		// Create Fonts dir
		function(callback) {
			// Fonts - are per user. Exists only in the physical file system and not on the Mongoose model
			var fontsSourceDir = path.join(userDir, conf.epub.fontsDir);
			filewalker(fontsSourceDir)
				.on('file', function(fontFile) {
					//console.log('fontFile: %s', fontFile);
					var fileExtension = getFileExtension(fontFile.toString());
					var font = {
						"id"			: fontPrefix + fontFile,
						"name"			: fontPrefix + fontFile.toString(),
						"fileExtension"	: fileExtension,
						"mediaType"		: getMediaType(fileExtension)
					};
					fonts.push(font);
					archive.append(fs.createReadStream(path.join(fontsSourceDir, fontFile)), { name: path.join(oepbsDir, conf.epub.fontsDir, font.id), store: false });
				})
				.on('error', function(err) {
					console.error(err);
					callback(err);
				})
				.on('done', function() {
					//console.log('Found: %d dirs, %d files, %d bytes', this.dirs, this.files, this.bytes);
					callback(null);
				})
				.walk();
		},

		// Create Images dir
		function(callback) {
			// Images - are per project. Exists only in the physical file system and not on the Mongoose model
			var projectDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + project._id);
			var imagesSourceDir = path.join(projectDir, conf.epub.imagesDir);
			filewalker(imagesSourceDir)
				.on('file', function(imageFile) {
					//console.log('imageFile: %s', imageFile);
					var fileExtension = getFileExtension(imageFile.toString());
					var image = {
						"id"			: imgPrefix + imageFile,
						"name"			: imgPrefix + imageFile.toString(),
						"fileExtension"	: fileExtension,
						"mediaType"		: getMediaType(fileExtension)
					};
					images.push(image);
					archive.append(fs.createReadStream(path.join(imagesSourceDir, imageFile)), { name: path.join(oepbsDir, conf.epub.imagesDir, image.id), store: false });
				})
				.on('error', function(err) {
					console.error(err);
					callback(err);
				})
				.on('done', function() {
					//console.log('Found: %d dirs, %d files, %d bytes', this.dirs, this.files, this.bytes);
					callback(null);
				})
				.walk();
		},

		// Create stylesheet file
		function(callback) {
			createStylesheet(oepbsDir, callback);
		},

		// Create HTML dir
		function(callback) {
			createHTML(oepbsDir, htmlDir, docPrefix, documents, callback);
		},

		// Create content.opf file
		function(callback) {
			createContentOpf(oepbsDir,
							 htmlDir,
				 			 docPrefix,
							 imgPrefix,
							 fontPrefix,
				 			 documents,
							 images,
							 fonts,
							 title,
							 authors,
							 language,
							 cover,
							 isbn,
							 uuid,
							 keywords,
							 description,
							 rights,
							 publicationDate,
							 type,
							 contributors,
							 publisher,
							 coverage,
							 relation,
							 source,
							 callback);
		},

		// Create toc.ncx file
		function(callback) {
			createToC(oepbsDir, toc, uuid, title, authors, callback);
		},

		// Finalize EPUB archive
		function (callback) {
			finalizeArchive(callback);
			callback(null);
		},

		// Save EPUB in user's folder
		function(callback) {
			archive.pipe(fs.createWriteStream(path.join(userDir, project._id + '.epub')));
			callback(null);
		}
	]);

	return archive;
}
