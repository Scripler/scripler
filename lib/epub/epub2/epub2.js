var express = require('express');
var Project = require('../../../models/project.js').Project;
var path = require('path');
var archiver = require('archiver');
var fs = require('fs');
var filewalker = require('filewalker');
var moment = require('moment');
var conf = require('config');
var uuid_lib = require('node-uuid');

var appDir = path.dirname(__dirname);
var templateDir = path.join(appDir, "epub2", "template");

var archive = archiver('zip', {zlib: {level: 9}});

archive.on('error', function(err) {
	throw err;
});

function createMimeType() {
	var mimetypeFilename = 'mimetype';
    var mimetypeTemplateFilename = path.join(templateDir, mimetypeFilename);
    var mimeTypeReadStream = fs.createReadStream(mimetypeTemplateFilename);
	archive.append(mimeTypeReadStream, { name: mimetypeFilename, store: true });
}

function createMetaInf() {
    var dirName = 'META-INF';

	var containerFilename = 'container.xml';
	var containerTemplateFilename = path.join(templateDir, dirName, containerFilename);
	var containerFileReadStream = fs.createReadStream(containerTemplateFilename);
	archive.append(containerFileReadStream, { name: path.join(dirName, containerFilename), store: false });

	var iBooksFilename = 'com.apple.ibooks.display-options.xml';
	var iBooksTemplateFilename = path.join(templateDir, dirName, iBooksFilename);
	var iBooksFileReadStream = fs.createReadStream(iBooksTemplateFilename);
	archive.append(iBooksFileReadStream, { name: path.join(dirName, iBooksFilename), store: false });
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

function createStylesheet(oepbsTemplateDir) {
	var stylesheetFilename = "stylesheet.css";
	var stylesheet = getStylesheet();
	archive.append(stylesheet, { name: path.join(oepbsTemplateDir, stylesheetFilename), store: false });
}

var getManifestFilesString = exports.getManifestFilesString = function (prefix, folderName, manifestFiles, fileExtension, mediaType) {
	var manifestFilesString = '';
	if (manifestFiles != null && manifestFiles.length > 0) {
		for (var i=0; i<manifestFiles.length; i++) {
			var manifestFile = manifestFiles[i];

			if (manifestFile.type == 'Cover' || manifestFile.type == 'TitlePage' || manifestFile.type == 'ToC' || manifestFile.type == 'Colophon') {
				manifestFilesString += '<item id="' + manifestFile.type + '.' + fileExtension + '" href="' + folderName + '/' + manifestFile.type + '.' + fileExtension + '" media-type="' + mediaType + '" />';
			} else {
				manifestFilesString += '<item id="' + prefix + manifestFile.id + '.' + fileExtension + '" href="' + folderName + '/' + prefix + manifestFile.id + '.' + fileExtension + '" media-type="' + mediaType + '" />';
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

			if (htmlFile.type == 'Cover' || htmlFile.type == 'TitlePage' || htmlFile.type == 'ToC' || htmlFile.type == 'Colophon') {
				spineDocumentsString += '<itemref idref="' + htmlFile.type + '.' + fileExtension + '" />';
			} else {
				spineDocumentsString += '<itemref idref="' + prefix + htmlFile.id + '.' + fileExtension + '" />';
			}
		}
	}
	return spineDocumentsString;
}

function createContentOpf(oepbsDir, htmlDir, docPrefix, documents, images, fonts, title, authors, language, coverImagePath, isbn, uuid, keywords, description) {
    var contentOpfFilename = 'content.opf';
    var contentOpfTemplateFilename = path.join(templateDir, oepbsDir, contentOpfFilename);
	var contentOpfFileReadStream = fs.createReadStream(contentOpfTemplateFilename);

    var manifestHtmlFilesString = getManifestFilesString(docPrefix, 'HTML', documents, 'html', 'application/xhtml+xml');
    var manifestImageFilesString = getManifestFilesString('img_', 'Images', images, 'jpg', 'image/jpeg'); // TODO: get image files + support other image formats!
    var manifestFontFilesString = getManifestFilesString('font_', 'Fonts', fonts, 'ttf', 'application/x-font-ttf'); // TODO: get font files + support other font formats?

	var manifestFontLicenseName = 'Scripler-license.txt';
	var manifestFontLicenseFilename = path.join(templateDir, manifestFontLicenseName);
	var manifestFontLicenseReadStream = fs.createReadStream(manifestFontLicenseFilename);
	archive.append(manifestFontLicenseReadStream, { name: path.join(oepbsDir, manifestFontLicenseName), store: false });

    var spineDocumentsString = getSpineDocumentsString('doc_', documents, 'html');
    var guideCoverString = '<reference href="' + htmlDir + '/Cover.html" title="Cover" type="cover" />';
    var guideTitlePageString = '<reference href="' + htmlDir + '/TitlePage.html" title="Title Page" type="title-page" />';
    var guideColophonString = '<reference href="' + htmlDir + '/Colophon.html" title="Colophon" type="colophon" />';
    var guideToCString = '<reference href="' + htmlDir + '/ToC.html" title="Table of Contents" type="toc" />';

	var modificationDate = moment().format("YYYY-MM-DD");

	// TODO: get real values
	var type = "single";
	var rights = "© Mr. Hattivatti";
	var contributor = "Scripler";
	var publicationDate = moment().format("YYYY-MM-DD");
	var publisher = "Indie Publisher Numero Uno";
	var format = "999 pages of pure goodness";

	contentOpfFileReadStream.setEncoding('utf8');
	contentOpfFileReadStream.on('data', function (contentOpfData) {
		contentOpfData = contentOpfData.replace("%metadata_uuid%", uuid).
										replace("%metadata_isbn%", isbn).
										// TODO: do we need a URI identifier?
										replace("%metadata_title%", title).
										// TODO: handle multiple authors how?
										replace("%metadata_author%", authors).
										replace("%metadata_language%", language).
										replace("%metadata_modification_date%", modificationDate).
										replace("%metadata_description%", description).
										replace("%metadata_type%", type).
										replace("%metadata_rights%", rights).
										replace("%metadata_contributor%", contributor).
										replace("%metadata_publication_date%", publicationDate).
										replace("%metadata_publisher%", publisher).
										replace("%metadata_format%", format).
										replace("%metadata_cover%", coverImagePath).
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
		throw err;
	});
}

function createToC(oepbsDir, toc, uuid, title, authors) {
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
		throw err;
	});
}

function getStylesheet() {
	var css = ''; // TODO: get stylesheet from db
	return css;
}

function createOebps(userId, projectId, title, authors, documents, toc, language, coverImagePath, isbn, uuid, keywords, description) {
    var oepbsDir = 'OEBPS';

    // Images - are per project. Exists only in the physical file system and not on the Mongoose model
	var images = [];
	var projectDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + projectId);
	var imagesDir = path.join(projectDir, 'Images');
	filewalker(imagesDir)
		.on('file', function(p) {
			console.log('dir:  %s', p);
			archive.append(fs.createReadStream(path.join(oepbsDir, imagesDir, p)), { name: p, store: false });
		})
		.on('error', function(err) {
			console.error(err);
		})
		.on('done', function() {
			console.log('Found: %d dirs, %d files, %d bytes', this.dirs, this.files, this.bytes);
		})
	.walk();

	// Fonts - are per user. Exists only in the physical file system and not on the Mongoose model
	var fonts = [];
	var userDir = path.join(conf.resources.usersDir, conf.epub.userDirPrefix + userId);
	var fontsDir = path.join(userDir, 'Fonts');
	 filewalker(fontsDir)
		 .on('file', function(p) {
		 	console.log('dir:  %s', p);
		 	archive.append(fs.createReadStream(path.join(oepbsDir, fontsDir, p)), { name: p, store: false });
		 })
		 .on('error', function(err) {
		 	console.error(err);
		 })
		 .on('done', function() {
		 	console.log('Found: %d dirs, %d files, %d bytes', this.dirs, this.files, this.bytes);
		 })
	 .walk();

    // Styles
    createStylesheet(oepbsDir);

    // HTML
    var htmlDir = 'HTML';
	var docPrefix = 'doc_'; // Filenames are not allowed to start with e.g. numbers, c.f.: http://code.google.com/p/epubcheck/issues/detail?id=193
    for (var i=0; i<documents.length; i++) {
		var document = documents[i];

		var documentName;
		if (document.type == 'Cover' || document.type == 'TitlePage' || document.type == 'ToC' || document.type == 'Colophon') {
			documentName = document.type + ".html";
		} else {
			documentName = docPrefix + document.id + ".html";
		}

		var documentFilename = path.join(oepbsDir, htmlDir, documentName);
        archive.append(document.text, { name: documentFilename, store: false });
	}

    // content.opf
    createContentOpf(oepbsDir, htmlDir, docPrefix, documents, images, fonts, title, authors, language, coverImagePath, isbn, uuid, keywords, description);

    // toc.ncx
    createToC(oepbsDir, toc, uuid, title, authors);
}

exports.create = function create (project, userId) {
	var metadata = project.metadata;

	// Create mimetype file
    createMimeType();

    // Create META-INF
    createMetaInf();

    // Create OEBPS
    // TODO: add custom metadata
    var title = metadata.title;
    var authors = metadata.authors;
    var documents = project.documents;
	var toc = metadata.toc;
    var language = metadata.language;
    var cover = metadata.cover;
    var isbn = metadata.isbn;
    var uuid = uuid_lib.v4();
    var keywords = metadata.keywords;
    var description = metadata.description;
    createOebps(userId, project._id, title, authors, documents, toc, language, cover, isbn, uuid, keywords, description);

    // Finalize EPUB archive
	archive.finalize(function(err, bytes) {
		if (err) {
			throw err;
		}
	});

	return archive;
}
