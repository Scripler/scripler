var express = require('express');
var Project = require('../models/project.js').Project;
var path = require('path');
var archiver = require('archiver');
var fs = require('fs');
var filewalker = require('filewalker');

var appDir = path.dirname(__dirname);
var baseDir = path.join(appDir, 'public', 'media');
var resDirName = path.join(baseDir, 'resources');

var archive = archiver('zip', {zlib: {level: 9}});

archive.on('error', function(err) {
	throw err;
});

function createMimeType() {
	var mimetypeFilename = 'mimetype';
    var mimetypeTemplateFilename = path.join(resDirName, mimetypeFilename);
    var mimeTypeReadStream = fs.createReadStream(mimetypeTemplateFilename);
	archive.append(mimeTypeReadStream, { name: mimetypeFilename, store: true });
}

function createMetaInf() {
    var dirName = 'META-INF';

	var containerFilename = 'container.xml';
	var containerTemplateFilename = path.join(resDirName, dirName, containerFilename);
	var containerFileReadStream = fs.createReadStream(containerTemplateFilename);
	archive.append(containerFileReadStream, { name: path.join(dirName, containerFilename), store: false });

	var iBooksFilename = 'com.apple.ibooks.display-options.xml';
	var iBooksTemplateFilename = path.join(resDirName, dirName, iBooksFilename);
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
					// TODO: throw error!
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

function createStylesheet(oepbsTemplateDirName) {
	var stylesheetFilename = "stylesheet.css";
	var stylesheetTemplateFilename = path.join(resDirName, oepbsTemplateDirName, stylesheetFilename);
	var stylesheetFileFs = fs.createReadStream(stylesheetTemplateFilename);
	archive.append(stylesheetFileFs, { name: path.join(oepbsTemplateDirName, stylesheetFilename), store: false });
}

var getManifestFilesString = exports.getManifestFilesString = function getManifestFilesString (folderName, manifestFiles, fileExtension, mediaType) {
	var manifestFilesString = '';
	if (manifestFiles != null && manifestFiles.length > 0) {
		for (var i=0; i<manifestFiles.length; i++) {
			var manifestFile = manifestFiles[i];
			manifestFilesString += '<item id="' + manifestFile.id + '" href="' + folderName + '/' + manifestFile.id + '.' + fileExtension + '" media-type="' + mediaType + '" />\n';
		}
	}
	return manifestFilesString;
}

var getSpineDocumentsString = exports.getSpineDocumentsString = function getSpineDocumentsString (htmlFiles) {
	var spineDocumentsString = '';
	if (htmlFiles != null && htmlFiles.length > 0) {
		for (var i=0; i<htmlFiles.length; i++) {
			var htmlFile = htmlFiles[i];
			spineDocumentsString += '<itemref idref="' + htmlFile.id + '" />\n';
		}
	}
	return spineDocumentsString;
}

function createContentOpf(oepbsDirName, documents, title, authors, language, coverImagePath, isbn, uuid, keywords, description) {
    var contentOpfFilename = 'content.opf';
    var contentOpfTemplateFilename = path.join(resDirName, oepbsDirName, contentOpfFilename);
	var contentOpfFileReadStream = fs.createReadStream(contentOpfTemplateFilename);

    var manifestHtmlFilesString = getManifestFilesString('HTML', documents, 'html', 'application/xhtml+xml');
    var manifestImageFilesString = getManifestFilesString('Images', documents, 'jpg', 'image/jpeg'); // TODO: get image files + support other image formats!
    var manifestFontFilesString = getManifestFilesString('Fonts', documents, 'tff', 'application/x-font-ttf'); // TODO: get font files + support other font formats?
    var manifestFontLicenseName = 'Scripler-license';
    var spineDocumentsString = getSpineDocumentsString(documents);
    var guideCoverString = '<reference href="Cover.html" title="Cover" type="cover" />';
    var guideTitlePageString = '<reference href="TitlePage.html" title="Title Page" type="title-page" />';
    var guideColophonString = '<reference href="Colophon.html" title="Colophon" type="colophon" />';
    var guideToCString = '<reference href="ToC.html" title="Table of Contents" type="toc" />';

	var modificationDate = Date.now();

	// TODO: get real values
	var type = "single";
	var rights = "© Mr. Hattivatti";
	var contributor = "Scripler";
	var publicationDate = Date.now();
	var publisher = "Indie Publisher Numero Uno";
	var format = "999 pages of pure goodness";

	contentOpfFileReadStream.setEncoding('utf8');
	contentOpfFileReadStream.on('data', function (contentOpfData) {
		contentOpfData = contentOpfData.replace("%metadata_uuid%", uuid).
										replace("%metadata_title%", title).
										// TODO: handle multiple authors how?
										replace("%metadata_author%", authors).
										replace("%metadata_language%", language).
										replace("%metadata_modification_date%", modificationDate).
										replace("%metadata_description%", description).
										replace("%metadata_identifier%", isbn).
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
		archive.append(contentOpfData, { name: path.join(oepbsDirName, contentOpfFilename), store: false });
	});

	contentOpfFileReadStream.on('error', function (err) {
		throw err;
	});
}

function createToC(oepbsDirName, toc, uuid, title, authors) {
    var tocFilename = 'toc.ncx';
	var tocTemplateFilename = path.join(resDirName, oepbsDirName, tocFilename);
	var tocFileReadStream = fs.createReadStream(tocTemplateFilename);

    var navpoints = getNavPointsString(toc.entries);

	tocFileReadStream.setEncoding('utf8');
	tocFileReadStream.on('data', function (tocData) {
		tocData = tocData.replace("%uuid%", uuid).
						  replace("%title%", title).
						  // TODO: handle multiple authors how?
						  replace("%author%", authors).
						  replace("%navpoints%", navpoints);
		archive.append(tocData, { name: path.join(oepbsDirName, tocFilename), store: false });
	});

	tocFileReadStream.on('error', function (err) {
		throw err;
	});
}

function createOebps(title, authors, documents, toc, language, coverImagePath, isbn, uuid, keywords, description) {
    var oepbsDirName = 'OEBPS';

    // Fonts
    // TODO: get base dir for font files (where have the user's font files been saved?)
	/*
	var fontsDirName = 'Fonts';
	filewalker(fontsDirName)
		.on('file', function(p) {
			console.log('dir:  %s', p);
			archive.append(fs.createReadStream(oepbsDirName + '/' + fontsDirName + '/' + p), { name: p, store: false });
		})
		.on('error', function(err) {
			console.error(err);
		})
		.on('done', function() {
			console.log('Found: %d dirs, %d files, %d bytes', this.dirs, this.files, this.bytes);
		})
		.walk();
	*/

    // Images
	// TODO: get base dir for image files (where have the user's image files been saved?)
	/*
    var imageDirName = 'Images';
	filewalker(imageDirName)
		.on('file', function(p) {
			console.log('dir:  %s', p);
			archive.append(fs.createReadStream(oepbsDirName + '/' + imageDirName + '/' + p), { name: p, store: false });
		})
		.on('error', function(err) {
			console.error(err);
		})
		.on('done', function() {
			console.log('Found: %d dirs, %d files, %d bytes', this.dirs, this.files, this.bytes);
		})
	.walk();
	*/

    // Styles
    createStylesheet(oepbsDirName);

    // HTML
    var textDirName = 'HTML';
    for (var i=0; i<documents.length; i++) {
		var document = documents[i];
		var documentFilename = path.join(oepbsDirName, textDirName, document.name + ".html");
        archive.append(document.text, { name: documentFilename, store: false });
	}

    // content.opf
    createContentOpf(oepbsDirName, documents, title, authors, language, coverImagePath, isbn, uuid, keywords, description);

    // toc.ncx
    createToC(oepbsDirName, toc, uuid, title, authors);
}

exports.create = function create (project) {
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
    var uuid = "a-random-uuid"; // TODO: generate a "real" random UUID
    var keywords = metadata.keywords;
    var description = metadata.description;
    createOebps(title, authors, documents, toc, language, cover, isbn, uuid, keywords, description);

    // Finalize EPUB archive
	archive.finalize(function(err, bytes) {
		if (err) {
			throw err;
		}
	});

	return archive;
}
