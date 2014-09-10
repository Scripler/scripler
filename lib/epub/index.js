var conf = require('config');
var path = require('path');
var fs = require('fs');
var moment = require('moment');
var archiver = require('archiver');
var filewalker = require('filewalker');
var uuid_lib = require('node-uuid');
var async = require('async');
var Project = require('../../models/project.js').Project;
var Styleset = require('../../models/styleset.js').Styleset;
var Image = require('../../models/image.js').Image;
var Font = require('../../models/font.js').Font;
var utils = require('../../lib/utils');
var styleset_utils = require('../../lib/styleset-utils');
var styleset_utils_shared = require('../../public/create/scripts/utils-shared');
var project_utils = require('../../lib/project-utils');

var getCloseNavPointsString = exports.getCloseNavPointsString = function (currentLevel, previousLevel) {
	var closeNavPointsString = '';

	var numberOfNavPoints = previousLevel - currentLevel;
	for (var i = 0; i <= numberOfNavPoints; i++) {
		closeNavPointsString += '</navPoint>';
	}

	return closeNavPointsString;
}

var getNavPointsString = exports.getNavPointsString = function (tocEntries) {
	var navPointsString = '';
	var navPointEntry = '<navPoint id="navpoint-%playorder%" playOrder="%playorder%">' +
		'<navLabel>' +
		'<text>%text%</text>' +
		'</navLabel>' +
		'<content src="%contentTarget%"/>';

	if (tocEntries != null && tocEntries.length > 0) {
		var navPointEntryValuesInserted = '';
		var previousLevel = null;
		var tocEntry = null;
		for (var i = 0; i < tocEntries.length; i++) {
			tocEntry = tocEntries[i];

			// On our way up => close the appropriate number of navPoints
			if (previousLevel != null && previousLevel >= tocEntry.level) {
				if (previousLevel - tocEntry.level > 1) {
					throw "Could not jump " + (previousLevel - tocEntry.level) + " levels generating navigation points";
				}
				navPointsString += getCloseNavPointsString(tocEntry.level, previousLevel);
			}

			// Always just create the navPoint (expect the previous iteration to have closed the appropriate navPoints)
			navPointEntryValuesInserted = navPointEntry.replace(/%playorder%/g, i + 1).replace("%text%", tocEntry.text).replace("%contentTarget%", tocEntry.target);
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
		for (var i = 0; i < manifestFiles.length; i++) {
			var manifestFile = manifestFiles[i];

			if (project_utils.includeInEbook(manifestFile)) {
				var id = manifestFile.id;
				var type = manifestFile.type;
				var name = manifestFile.name;
				var fileExtension = manifestFile.fileExtension;
				var mediaType = manifestFile.mediaType;

				if (project_utils.isSystemType(type)) {
					var documentTypeName = project_utils.getDocumentTypeName(type);
					manifestFilesString += '<item id="' + documentTypeName + '.' + fileExtension + '" href="' + folderName + '/' + documentTypeName + '.' + fileExtension + '" media-type="' + mediaType + '" />';
				} else if (folderName == 'Styles') { // TODO: make this check prettier!
					manifestFilesString += '<item id="' + name + '" href="' + folderName + '/' + name + '" media-type="' + mediaType + '" />';
				} else if (folderName == 'Fonts') { // TODO: This is a bit of a hack until we get user fonts
					manifestFilesString += '<item id="' + id + '" href="' + folderName + '/' + id + '" media-type="' + mediaType + '" />';
				} else if (folderName == 'Images') { // TODO: make this check prettier!
					manifestFilesString += '<item id="' + conf.epub.imagePrefix + name + '" href="' + folderName + '/' + conf.epub.imagePrefix + name + '" media-type="' + mediaType + '" />';
				} else {
					manifestFilesString += '<item id="' + prefix + id + '.' + fileExtension + '" href="' + folderName + '/' + prefix + id + '.' + fileExtension + '" media-type="' + mediaType + '" />';
				}
			}
		}
	}
	return manifestFilesString;
}

var getSpineDocumentsString = exports.getSpineDocumentsString = function (prefix, htmlFiles, fileExtension) {
	var spineDocumentsString = '';
	if (htmlFiles != null && htmlFiles.length > 0) {
		for (var i = 0; i < htmlFiles.length; i++) {
			var htmlFile = htmlFiles[i];

			if (project_utils.isSystemType(htmlFile.type)) {
				var documentTypeName = project_utils.getDocumentTypeName(htmlFile.type);
				spineDocumentsString += '<itemref idref="' + documentTypeName + '.' + fileExtension + '" />';
			} else {
				spineDocumentsString += '<itemref idref="' + prefix + htmlFile.id + '.' + fileExtension + '" />';
			}
		}
	}
	return spineDocumentsString;
}

var getGuideString = exports.getGuideString = function getGuideString(type, documents) {
	var guideString = '';

	for (var i = 0; i < documents.length; i++) {
		var document = documents[i];

		if (project_utils.includeInEbook(document)) {
			var documentTypeName = project_utils.getDocumentTypeName(type);
			var documentTypeTitle = project_utils.getDocumentTypeTitle(type);

			if (document.type == type) {
				guideString += '<reference href="' + conf.epub.htmlDir + '/' + documentTypeName + '.html" title="' + documentTypeTitle + '" type="' + type + '" />';
				break; // Only one of each of the system types is allowed per ebook
			}
		}
	}

	return guideString;
}

function isValidEPUBType(epubType) {
	return epubType == 'epub2' || epubType == 'epub3';
}

var getAuthorString = exports.getAuthorString = function getAuthorString(authors, epubType) {
	var authorString = '';

	if (!isValidEPUBType(epubType)) {
		throw 'Unknown EPUB type!';
	}

	for (var i = 0; i < authors.length; i++) {
		var author = authors[i];
		if (epubType == 'epub2') {
			authorString += '<dc:creator opf:role="aut">' + author + '</dc:creator>';
		} else if (epubType == 'epub3') {
			authorString += '<dc:creator id="creator' + i + '">' + author + '</dc:creator><meta id="role-creator' + i + '" property="role" refines="#creator' + i + '" scheme="marc:relators">aut</meta>';
		}
	}

	return authorString;
}

var getKeywordString = exports.getKeywordString = function getKeywordString(keywords) {
	var keywordString = '';

	for (var i = 0; i < keywords.length; i++) {
		var keyword = keywords[i];
		keywordString += '<dc:subject>' + keyword + '</dc:subject>';
	}

	return keywordString;
}

var getContributorString = exports.getContributorString = function getContributorString(contributors, epubType) {
	var contributorString = '';

	if (!isValidEPUBType(epubType)) {
		throw 'Unknown EPUB type!';
	}

	for (var i = 0; i < contributors.length; i++) {
		var contributor = contributors[i];
		if (epubType == 'epub2') {
			contributorString += '<dc:contributor opf:role="' + contributor.role + '">' + contributor.name + '</dc:contributor>';
		} else if (epubType == 'epub3') {
			contributorString += '<dc:contributor id="contributor' + i + '">' + contributor.name + '</dc:contributor><meta id="role-contributor' + i + '" property="role" refines="#contributor' + i + '" scheme="marc:relators">' + contributor.role + '</meta>';
		}
	}

	return contributorString;
}

var createMimeType = exports.createMimeType = function createMimeType(archive, templateDir, callback) {
	var mimetypeFilename = 'mimetype';
	var mimetypeTemplateFilename = path.join(templateDir, mimetypeFilename);
	var mimeTypeReadStream = fs.createReadStream(mimetypeTemplateFilename);

	mimeTypeReadStream.on('data', function (mimeTypeData) {
		archive.append(mimeTypeData, { name: mimetypeFilename, store: true }); // mimetype must be stored uncompressed
	});

	mimeTypeReadStream.on('end', function () {
		callback(null);
	});
}

var createMetaInf = exports.createMetaInf = function createMetaInf(archive, templateDir, callback) {
	var dirName = 'META-INF';

	var containerFilename = 'container.xml';
	var containerTemplateFilename = path.join(templateDir, dirName, containerFilename);
	var containerFileReadStream = fs.createReadStream(containerTemplateFilename);

	containerFileReadStream.on('data', function (containerFileData) {
		archive.append(containerFileData, { name: path.join(dirName, containerFilename), store: false });
	});

	containerFileReadStream.on('end', function () {
		var iBooksFilename = 'com.apple.ibooks.display-options.xml';
		var iBooksTemplateFilename = path.join(templateDir, dirName, iBooksFilename);
		var iBooksFileReadStream = fs.createReadStream(iBooksTemplateFilename);

		iBooksFileReadStream.on('data', function (iBooksFileData) {
			archive.append(iBooksFileData, { name: path.join(dirName, iBooksFilename), store: false });
		});

		iBooksFileReadStream.on('end', function () {
			callback(null);
		});
	});
}

var createHTML = exports.createHTML = function createHTML(docPrefix, documents, htmlDir, epubDir, archive, callback) {
	for (var i = 0; i < documents.length; i++) {
		var document = documents[i];

		if (project_utils.includeInEbook(document)) {
			var documentName;
			var documentType = document.type;
			if (project_utils.isSystemType(documentType)) {
				var documentTypeName = project_utils.getDocumentTypeName(documentType, documents);
				documentName = documentTypeName + ".html";
			} else {
				documentName = docPrefix + document.id + ".html";
			}

			var documentFilename = path.join(epubDir, htmlDir, documentName);
			archive.append(document.text, { name: documentFilename, store: false });
		}
	}
	callback(null);
}

var createContentOpf = exports.createContentOpf = function createContentOpf(archive, templateDir, epubDir, epubType, docPrefix, imgPrefix, fontPrefix, stylePrefix, fonts, documents, images, stylesets, title, authors, language, cover, isbn, uuid, keywords, description, rights, publicationDate, type, contributors, publisher, coverage, relation, source, callback) {
	var contentOpfFilename = 'content.opf';
	var contentOpfTemplateFilename = path.join(templateDir, epubDir, contentOpfFilename);
	var contentOpfFileReadStream = fs.createReadStream(contentOpfTemplateFilename);

	var manifestFontFilesString = getManifestFilesString(fontPrefix, conf.epub.fontsDir, fonts);
	var manifestHtmlFilesString = getManifestFilesString(docPrefix, conf.epub.htmlDir, documents);
	var manifestImageFilesString = getManifestFilesString(imgPrefix, conf.epub.imagesDir, images);
	var manifestStyleFilesString = getManifestFilesString(stylePrefix, conf.epub.stylesDir, stylesets);

	var manifestFontLicenseName = 'Scripler-license.txt';
	var manifestFontLicenseFilename = path.join(templateDir, manifestFontLicenseName);
	var manifestFontLicenseReadStream = fs.createReadStream(manifestFontLicenseFilename);
	archive.append(manifestFontLicenseReadStream, { name: path.join(epubDir, manifestFontLicenseName), store: false });

	var spineDocumentsString = getSpineDocumentsString(docPrefix, documents, 'html');

	var guideCoverString = getGuideString('cover', documents);
	var guideTitlePageString = getGuideString('titlepage', documents);
	var guideColophonString = getGuideString('colophon', documents);
	var guideToCString = getGuideString('toc', documents);

	var authorString = getAuthorString(authors, epubType);
	var keywordString = getKeywordString(keywords);
	var contributorString = getContributorString(contributors, epubType);

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
		archive.append(contentOpfData, { name: path.join(epubDir, contentOpfFilename), store: false });
	});

	contentOpfFileReadStream.on('error', function (err) {
		console.log('createContentOpf: ' + err);
		throw err;
	});

	contentOpfFileReadStream.on('end', function () {
		callback(null);
	});
}
var createToC = exports.createToC = function createToC(toc, uuid, title, authors, archive, templateDir, epubDir, callback) {
	var tocFilename = 'toc.ncx';
	var tocTemplateFilename = path.join(templateDir, epubDir, tocFilename);
	var tocFileReadStream = fs.createReadStream(tocTemplateFilename);

	var navpoints = getNavPointsString(toc.entries);

	tocFileReadStream.setEncoding('utf8');
	tocFileReadStream.on('data', function (tocData) {
		tocData = tocData.replace("%uuid%", uuid).
			replace("%title%", title).
			replace("%author%", authors).
			replace("%navpoints%", navpoints);
		archive.append(tocData, { name: path.join(epubDir, tocFilename), store: false });
	});

	tocFileReadStream.on('error', function (err) {
		console.log('createToC: ' + err);
		throw err;
	});

	tocFileReadStream.on('end', function () {
		callback(null);
	});
}

var finalizeArchive = exports.finalizeArchive = function finalizeArchive(archive, callback) {
	console.log('finalizeArchive');
	archive.finalize(function (err, bytes) {
		if (err) {
			console.log('finalizeArchive err: ' + err);
			return callback(err);
		}

		console.log('finalizeArchive done');
		return callback(null);
	});
}
var create = exports.create = function create(epubType, userId, project, archive, templateDir, epubDir, createNav, next) {
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
	for (var i = 0; i < documents.length; i++) {
		var document = documents[i];
		if (project_utils.includeInEbook(document)) {
			document.fileExtension = 'html';
			document.mediaType = 'application/xhtml+xml';
			// TODO: something is missing here...do something with the document!
		}
	}

	var userDir = path.join(conf.resources.usersDir, conf.epub.userDirPrefix + userId);

	// Filenames are not allowed to start with e.g. numbers (c.f.: http://code.google.com/p/epubcheck/issues/detail?id=193) which is typically the case for Mongo object ids
	var docPrefix = conf.epub.documentPrefix;
	var imgPrefix = conf.epub.imagePrefix;
	var fontPrefix = conf.epub.fontPrefix;
	var stylePrefix = conf.epub.stylePrefix;

	var images = [];
	var fonts = [];
	var stylesetFiles = [];

	async.series([
		// Create mimetype file
		function (callback) {
			createMimeType(archive, templateDir, callback);
		},

		// Create META-INF dir
		function (callback) {
			createMetaInf(archive, templateDir, callback);
		},

		// System fonts
		function (callback) {
			// System/Scripler fonts
			var createSystemFont = function (font, callback) {
				var systemFontsSourceDir = path.join(__dirname, '../../public/create/stylesets/', conf.epub.fontsDir);
				var filename = font.src.replace(conf.epub.fontsDir + "/", "");
				var fileExtension = utils.getFileExtension(filename);
				var font = {
					"id": filename,
					"family": font.family,
					"style": font.style,
					"weight": font.weight,
					"src": font.src,
					"fileExtension": fileExtension,
					"mediaType": utils.getMediaType(fileExtension)
				};
				fonts.push(font);
				archive.append(fs.createReadStream(path.join(systemFontsSourceDir, filename)), { name: path.join(epubDir, conf.epub.fontsDir, font.id), store: false });
				callback(null);
			};

			for (var i=0; i<documents.length; i++) {
				var document = documents[i];
				Font.find({"documentId": document._id}, function (err, fonts) {
					if (err) return callback(err);
					async.each(fonts, createSystemFont, function(err) {
						if (err) callback(err);
					});
				});
			}
			callback(null);
		},

		// Images
		function (callback) {
			// Images - are per project. Exists both in the physical file system and on the Mongoose model
			var projectDir = path.join(conf.resources.projectsDir, conf.epub.projectDirPrefix + project._id);
			var imagesSourceDir = path.join(projectDir, conf.epub.imagesDir);

			Image.find({"projectId": project._id}, function (err, dbImages) {
				for (var i=0; i<dbImages.length; i++) {
					var image = dbImages[i];
					var srcImageFilename = path.join(imagesSourceDir, image.name);
					var dstImageFilename = path.join(epubDir, conf.epub.imagesDir, conf.epub.imagePrefix + image.name);
					images.push(image);
					archive.append(fs.createReadStream(srcImageFilename), { name: dstImageFilename, store: false });
				}

				callback(null);
			});
		},

		// Stylesets
		function (callback) {
			styleset_utils.getNonEditableCss(fonts, function (err, nonEditableCss) {
				if (err) callback(err);

				// Stylesets - are per project. Exists only in the database (on the Mongoose model) - except for non-editable CSS, see below.
				var fileExtension = 'css';
				var allStylesets = [];

				// TODO: Create one CSS file per document, so we can do proper defaultStyleset!
				allStylesets.push(project.styleset);
				var defaultStyleset = project.styleset;

				if (nonEditableCss) {
					var stylesetFileId = "non-editable" + '.' + fileExtension;
					var stylesetFile = {
						"id": stylesetFileId,
						"name": stylesetFileId,
						"fileExtension": fileExtension,
						"mediaType": utils.getMediaType(fileExtension)
					};
					stylesetFiles.push(stylesetFile);
					archive.append(nonEditableCss, { name: path.join(epubDir, conf.epub.stylesDir, stylesetFileId), store: false });
				}

				for (var i=0; i<documents.length; i++) {
					var document = documents[i];
					if (document.stylesets && document.stylesets.length > 0) {
						for (var j=0; j<document.stylesets.length; j++) {
							var styleset = document.stylesets[j];
							allStylesets.push(styleset);
						}
					}
				}

				var populateStyleset = function (styleset, callback) {
					var stylesetContents = styleset_utils_shared.getStylesetContents(styleset, styleset._id.equals(defaultStyleset));
					if (stylesetContents) {
						var stylesetFileId = stylePrefix + styleset._id + '.' + fileExtension;
						var stylesetFile = {
							"id": stylesetFileId,
							"name": stylesetFileId,
							"fileExtension": fileExtension,
							"mediaType": utils.getMediaType(fileExtension)
						};
						stylesetFiles.push(stylesetFile);
						archive.append(stylesetContents, { name: path.join(epubDir, conf.epub.stylesDir, stylesetFileId), store: false });
					}
					callback(null);
				};

				var populateStylesets = function (stylesetIds, callback) {
					Styleset.find({"_id": {$in: stylesetIds}}).populate({path: 'styles', match: {archived: false}}).exec(function (err, stylesets) {
						async.each(stylesets, populateStyleset, function(err) {
							if (err) callback(err);
							callback(null);
						});
					});
				};

				if (allStylesets && allStylesets.length > 0) {
					populateStylesets(allStylesets, function(err) {
						if (err) callback(err);
						callback(null);
					});
				} else {
					callback(null);
				}
			});
		},

		// HTML
		function (callback) {
			createHTML(docPrefix, documents, conf.epub.htmlDir, epubDir, archive, callback);
		},

		// content.opf
		function (callback) {
			createContentOpf(
				archive,
				templateDir,
				epubDir,
				epubType,
				docPrefix,
				imgPrefix,
				fontPrefix,
				stylePrefix,
				fonts,
				documents,
				images,
				stylesetFiles,
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

		// toc.ncx
		function (callback) {
			createToC(toc, uuid, title, authors, archive, templateDir, epubDir, callback);
		},

		// If EPUB3, create nav.xhtml file
		function (callback) {
			if (epubType == 'epub3') {
				createNav(toc, documents, archive, callback);
			}
		}
	], function (err, results) {
		if (err) {
			return next(err);
		}

		archive.finalize();
		archive.on('finish', function() {
			// Save EPUB in user's folder
			var output = fs.createWriteStream(path.join(userDir, project._id + '.epub'));
			archive.pipe(output);
			return next(null, archive);
		});

	});

}
