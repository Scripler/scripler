var conf = require('config');
var express = require('express');
var fs = require('fs');
var path = require('path');
var archiver = require('archiver');
var filewalker = require('filewalker');
var moment = require('moment');
var uuid_lib = require('node-uuid');
var async = require('async');

var Project = require('../../../models/project.js').Project;
var utils = require('../../../lib/utils');

var appDir = path.dirname(__dirname);
var templateDir = path.join(appDir, "epub3", "template");
var archive = archiver('zip', {zlib: {level: 9}});

var epub2 = require('../epub2');

var getTocString = exports.getTocString = function (tocEntries) {
	var tocString = '';
	var tocEntryString = '<li><a href="%target%">%title%</a></li>';

	if (tocEntries != null && tocEntries.length > 0) {
		var tocEntryValuesInserted = '';
		for (var i=0; i<tocEntries.length; i++) {
			var tocEntry = tocEntries[i];
			tocEntryValuesInserted = tocEntryString.replace("%target%", tocEntry.target).replace("%title%", tocEntry.title);
			tocString += tocEntryValuesInserted;
		}
	}

	return tocString;
}

var getLandmarkString = exports.getLandmarkString = function getLandmarkString(type, documents) {
	var landmarkString = '';

	for (var i=0; i<documents.length; i++) {
		var document = documents[i];
		var documentTypeName = epub2.getDocumentTypeName(type);
		var documentTypeTitle = epub2.getDocumentTypeTitle(type);

		if (document.type == type) {
			landmarkString = '<li><a epub:type="' + type + '" href="' + conf.epub.htmlDir + '/' + documentTypeName + '.html">' + documentTypeTitle + '</a></li>';
			break; // Only one of each of the system types is allowed per ebook
		}
	}

	return landmarkString;
}

function createMimeType(callback) {
	var mimetypeFilename = 'mimetype';
	var mimetypeTemplateFilename = path.join(templateDir, mimetypeFilename);
	var mimeTypeReadStream = fs.createReadStream(mimetypeTemplateFilename);
	archive.append(mimeTypeReadStream, { name: mimetypeFilename, store: true }); // mimetype must be stored uncompressed
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

function createHTML(docPrefix, documents, callback) {
	for (var i=0; i<documents.length; i++) {
		var document = documents[i];

		var documentName;
		if (epub2.isSystemType(document.type)) {
			var documentTypeName = epub2.getDocumentTypeName(document.type, documents);
			documentName = documentTypeName + ".html";
		} else {
			documentName = docPrefix + document.id + ".html";
		}

		var documentFilename = path.join(conf.epub3.epubDir, conf.epub.htmlDir, documentName);
		archive.append(document.text, { name: documentFilename, store: false });
	}
	callback(null);
}

function createContentOpf(docPrefix,
						  imgPrefix,
						  fontPrefix,
						  stylePrefix,
						  fonts,
						  documents,
						  images,
						  styles,
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
						  callback) {
	var contentOpfFilename = 'content.opf';
	var contentOpfTemplateFilename = path.join(templateDir, conf.epub3.epubDir, contentOpfFilename);
	var contentOpfFileReadStream = fs.createReadStream(contentOpfTemplateFilename);

	var manifestFontFilesString = epub2.getManifestFilesString(fontPrefix, conf.epub.fontsDir, fonts);
	var manifestHtmlFilesString = epub2.getManifestFilesString(docPrefix, conf.epub.htmlDir, documents);
	var manifestImageFilesString = epub2.getManifestFilesString(imgPrefix, conf.epub.imagesDir, images);
	var manifestStyleFilesString = epub2.getManifestFilesString(stylePrefix, conf.epub.stylesDir, styles);

	var manifestFontLicenseName = 'Scripler-license.txt';
	var manifestFontLicenseFilename = path.join(templateDir, manifestFontLicenseName);
	var manifestFontLicenseReadStream = fs.createReadStream(manifestFontLicenseFilename);
	archive.append(manifestFontLicenseReadStream, { name: path.join(conf.epub3.epubDir, manifestFontLicenseName), store: false });

	var spineDocumentsString = epub2.getSpineDocumentsString(docPrefix, documents, 'html');

	var guideCoverString = epub2.getGuideString('cover', documents);
	var guideTitlePageString = epub2.getGuideString('titlepage', documents);
	var guideColophonString = epub2.getGuideString('colophon', documents);
	var guideToCString = epub2.getGuideString('toc', documents);

	var authorString = '';
	for (var i=0; i<authors.length; i++) {
		var author = authors[i];
		authorString += '<dc:creator id="creator' + i + '">' + author + '</dc:creator><meta id="role-creator' + i +'" property="role" refines="#creator' + i + '" scheme="marc:relators">aut</meta>';
	}

	var keywordString = '';
	for (var i=0; i<keywords.length; i++) {
		var keyword = keywords[i];
		keywordString += '<dc:subject>' + keyword + '</dc:subject>';
	}

	var contributorString = '';
	for (var i=0; i<contributors.length; i++) {
		var contributor = contributors[i];
		contributorString += '<dc:contributor id="contributor' + i + '">' + contributor.name + '</dc:contributor><meta id="role-contributor' + i +'" property="role" refines="#contributor' + i + '" scheme="marc:relators">' + contributor.role + '</meta>';
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
			replace("%metadata_modification_date%", moment().format("YYYY-MM-DDTHH:mm:ss") + "Z").
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
			replace("%manifest_font_files%", manifestFontFilesString).
			replace("%manifest_html_files%", manifestHtmlFilesString).
			replace("%manifest_image_files%", manifestImageFilesString).
			replace("%manifest_style_files%", manifestStyleFilesString).
			replace(/%manifest_font_license_name%/g, manifestFontLicenseName).
			// Spine
			replace("%spine_documents%", spineDocumentsString).
			// Guide
			replace("%guide_cover%", guideCoverString).
			replace("%guide_titlepage%", guideTitlePageString).
			replace("%guide_colophon%", guideColophonString).
			replace("%guide_toc%", guideToCString);
		archive.append(contentOpfData, { name: path.join(conf.epub3.epubDir, contentOpfFilename), store: false });
	});

	contentOpfFileReadStream.on('error', function (err) {
		console.log('createContentOpf: ' + err);
		throw err;
	});

	contentOpfFileReadStream.on('end', function () {
		callback(null);
	});
}

function createToC(toc, uuid, title, authors, callback) {
	var tocFilename = 'toc.ncx';
	var tocTemplateFilename = path.join(templateDir, conf.epub3.epubDir, tocFilename);
	var tocFileReadStream = fs.createReadStream(tocTemplateFilename);

	var navpoints = epub2.getNavPointsString(toc.entries);

	tocFileReadStream.setEncoding('utf8');
	tocFileReadStream.on('data', function (tocData) {
		tocData = tocData.replace("%uuid%", uuid).
			replace("%title%", title).
			// TODO: handle multiple authors how?
			replace("%author%", authors).
			replace("%navpoints%", navpoints);
		archive.append(tocData, { name: path.join(conf.epub3.epubDir, tocFilename), store: false });
	});

	tocFileReadStream.on('error', function (err) {
		console.log('createToC: ' + err);
		throw err;
	});

	tocFileReadStream.on('end', function () {
		callback(null);
	});
}

function createNav(toc, documents, callback) {
	var navFilename = 'nav.xhtml';
	var navTemplateFilename = path.join(templateDir, conf.epub3.epubDir, navFilename);
	var navFileReadStream = fs.createReadStream(navTemplateFilename);

	var tocString = getTocString(toc.entries);

	var landmarkCoverString = getLandmarkString('cover', documents);
	var landmarkTitlePageString = getLandmarkString('titlepage', documents);
	var landmarkToCString = getLandmarkString('toc', documents);
	var landmarkColophonString = getLandmarkString('colophon', documents);

	navFileReadStream.setEncoding('utf8');
	navFileReadStream.on('data', function (navData) {
		navData = navData.replace("%toc%", tocString).
						  replace("%landmark_cover%", landmarkCoverString).
						  replace("%landmark_titlepage%", landmarkTitlePageString).
						  replace("%landmark_toc%", landmarkToCString).
						  replace("%landmark_colophon%", landmarkColophonString);
		archive.append(navData, { name: path.join(conf.epub3.epubDir, navFilename), store: false });
	});

	navFileReadStream.on('error', function (err) {
		console.log('createNav: ' + err);
		throw err;
	});

	navFileReadStream.on('end', function () {
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

	// Filenames are not allowed to start with e.g. numbers (c.f.: http://code.google.com/p/epubcheck/issues/detail?id=193) which is typically the case for Mongo ids
	var docPrefix = 'doc_';
	var imgPrefix = 'img_';
	var fontPrefix = 'font_';
	var stylePrefix = 'style_';

	var images = [];
	var fonts = [];

	// TODO: get styles from db: Project?
	var styles = [];

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
					var fileExtension = utils.getFileExtension(fontFile.toString());
					var font = {
						"id"			: fontPrefix + fontFile,
						"name"			: fontPrefix + fontFile.toString(),
						"fileExtension"	: fileExtension,
						"mediaType"		: utils.getMediaType(fileExtension)
					};
					fonts.push(font);
					archive.append(fs.createReadStream(path.join(fontsSourceDir, fontFile)), { name: path.join(conf.epub3.epubDir, conf.epub.fontsDir, font.id), store: false });
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
					var fileExtension = utils.getFileExtension(imageFile.toString());
					var image = {
						"id"			: imgPrefix + imageFile,
						"name"			: imgPrefix + imageFile.toString(),
						"fileExtension"	: fileExtension,
						"mediaType"		: utils.getMediaType(fileExtension)
					};
					images.push(image);
					archive.append(fs.createReadStream(path.join(imagesSourceDir, imageFile)), { name: path.join(conf.epub3.epubDir, conf.epub.imagesDir, image.id), store: false });
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

		// Create Styles dir
		function(callback) {
			// Styles - are per project. Exists BOTH in the physical file system AND on the Mongoose model. TODO: actually get styles from the model.
			var projectDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + project._id);
			var stylesSourceDir = path.join(projectDir, conf.epub.stylesDir);
			filewalker(stylesSourceDir)
				.on('file', function(styleFile) {
					//console.log('styleFile: %s', styleFile);
					var fileExtension = utils.getFileExtension(styleFile.toString());
					var style = {
						"id"			: stylePrefix + styleFile,
						"name"			: stylePrefix + styleFile.toString(),
						"fileExtension"	: fileExtension,
						"mediaType"		: utils.getMediaType(fileExtension)
					};
					styles.push(style);
					archive.append(fs.createReadStream(path.join(stylesSourceDir, styleFile)), { name: path.join(conf.epub3.epubDir, conf.epub.stylesDir, style.id), store: false });
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

		// Create HTML dir
		function(callback) {
			createHTML(docPrefix, documents, callback);
		},

		// Create content.opf file
		function(callback) {
			createContentOpf(docPrefix,
							 imgPrefix,
							 fontPrefix,
							 stylePrefix,
							 fonts,
				 			 documents,
							 images,
							 styles,
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
			createToC(toc, uuid, title, authors, callback);
		},

		// Create nab.xhtml file
		function(callback) {
			createNav(toc, documents, callback);
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

archive.on('error', function(err) {
	throw err;
});
