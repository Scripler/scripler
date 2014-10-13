var conf = require('config');
var path = require('path');
var fs = require('fs');
var moment = require('moment');
var archiver = require('archiver');
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
var html4Entities = require(path.join(__dirname, '../html4-entities.json'));

var getCloseNavPointsString = exports.getCloseNavPointsString = function (currentLevel, previousLevel, indentationSize) {
	var closeNavPointsString = '';

	var numberOfNavPoints = previousLevel - currentLevel;
	for (var i = 0; i <= numberOfNavPoints; i++) {
		// Innermost closing navpoints first
		var level = numberOfNavPoints > 0 ? numberOfNavPoints + 1 - i : 1;
		// From http://stackoverflow.com/questions/1877475/repeat-character-n-times: "(Note that an array of length 11 gets you only 10 "a"s, since Array.join puts the argument between the array elements.)"
		var indentationString = new Array(level * indentationSize + 1).join(' ');
		closeNavPointsString += indentationString + '</navPoint>\r\n';
	}

	return closeNavPointsString;
}

var getNavPointsString = exports.getNavPointsString = function (tocEntries) {
	var navPointsString = '';
	// "navPoint" closing tag is added below
	var navPointEntry = '<navPoint id="navpoint-%playorder%" playOrder="%playorder%">' +
							'<navLabel>' +
								'<text>%text%</text>' +
							'</navLabel>' +
							'<content src="%contentTarget%"/>';

	const navPointindentationSize = 4;

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
				navPointsString += '\r\n' + getCloseNavPointsString(tocEntry.level, previousLevel, navPointindentationSize);
			}

			// Always just create the navPoint (expect the previous iteration to have closed the appropriate navPoints)
			navPointEntryValuesInserted = navPointEntry.replace(/%playorder%/g, i + 1).replace("%text%", tocEntry.text).replace("%contentTarget%", conf.epub.htmlDir + '/' + tocEntry.target);
			var level = tocEntry.level > 0 ? tocEntry.level + 1 : 1;
			// From http://stackoverflow.com/questions/1877475/repeat-character-n-times: "(Note that an array of length 11 gets you only 10 "a"s, since Array.join puts the argument between the array elements.)"
			var indentationString = new Array(level * navPointindentationSize + 1).join(' ');
			navPointsString += '\r\n' + indentationString + navPointEntryValuesInserted;

			previousLevel = tocEntry.level;
		}

		navPointsString += '\r\n' + getCloseNavPointsString(0, previousLevel, navPointindentationSize);
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

				var itemProperties = manifestFile.svg ? ' properties="svg"' : '';

				if (project_utils.isSystemType(type)) {
					var documentTypeName = project_utils.getDocumentTypeName(type);
					manifestFilesString += '    <item id="' + documentTypeName + '.' + fileExtension + '" href="' + folderName + '/' + documentTypeName + '.' + fileExtension + '"' + itemProperties + ' media-type="' + mediaType + '" />\r\n';
				} else if (folderName == conf.epub.stylesDir) {
					manifestFilesString += '    <item id="' + name + '" href="' + folderName + '/' + name + '" media-type="' + mediaType + '" />\r\n';
				} else if (folderName == conf.epub.fontsDir) { // TODO: This is a bit of a hack until we get user fonts
					manifestFilesString += '    <item id="' + id + '" href="' + folderName + '/' + id + '" media-type="' + mediaType + '" />\r\n';
				} else if (folderName == conf.epub.imagesDir) {
					manifestFilesString += '    <item id="' + conf.epub.imagePrefix + name + '" href="' + folderName + '/' + conf.epub.imagePrefix + name + '" media-type="' + mediaType + '" />\r\n';
				} else {
					manifestFilesString += '    <item id="' + prefix + id + '.' + fileExtension + '" href="' + folderName + '/' + prefix + id + '.' + fileExtension + '"' + itemProperties + ' media-type="' + mediaType + '" />\r\n';
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
				spineDocumentsString += '    <itemref idref="' + documentTypeName + '.' + fileExtension + '" />\r\n';
			} else {
				spineDocumentsString += '    <itemref idref="' + prefix + htmlFile.id + '.' + fileExtension + '" />\r\n';
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

var getStylesetLinks = exports.getStylesetLinks = function getStylesetLinks(document) {
	var stylesetLinks = '<link href="../Styles/non-editable.css" rel="stylesheet" type="text/css"/>';
	if (document.stylesets) {
		for (var i=0; i<document.stylesets.length; i++) {
			var stylesetId = document.stylesets[i];
			stylesetLinks = stylesetLinks + '<link href="../' + conf.epub.stylesDir + '/' + conf.epub.stylePrefix + stylesetId + '.css" rel="stylesheet" type="text/css"/>';
		}
	}

	return stylesetLinks;
}

var createHTML = exports.createHTML = function createHTML(docPrefix, documents, htmlDir, epubDir, archive, title, callback) {
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

			var documentContents = document.text.replace(/(<img[^>]+src=")([^"]*)(\/images\/)([^"]+)"([^>]*\/>)/gi, "$1" + '../' + conf.epub.imagesDir + "/" + conf.epub.imagePrefix + "$4\"$5");

			// We need to explitcitly specify the default styleset class, since all CSS files are generated as non-default stylesets.
			var defaultStylesetClass = 'styleset-' + document.defaultStyleset;

			var html = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
				'<!DOCTYPE html>' +
				'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">' +
				'<head>' +
				'<title>' + title + '</title>' +
				getStylesetLinks(document) +
				'</head>' +
				'<body class="' + defaultStylesetClass + '">' +
				documentContents +
				'</body></html>';

			html = utils.replaceMap(html, html4Entities);
			var documentFilename = path.join(epubDir, htmlDir, documentName);
			archive.append(html, { name: documentFilename, store: false });
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
			replace("%guide_toc%", guideToCString)
			// Empty guide-element is not allowed, so remove it if it has no content
			.replace(/ *<guide>\s+<\/guide>\s+/, "")
		;
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
			if (project_utils.documentUsesSVG(document)) {
				document.svg = true;
			}
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

			var includeStaticImage = function (name, mediaType) {
				var image = {
					name:      name,
					mediaType: mediaType
				};
				var srcImageFilename = path.join(__dirname, '../../public/create/stylesets/', conf.epub.imagesDir, image.name);
				var dstImageFilename = path.join(epubDir, conf.epub.imagesDir, conf.epub.imagePrefix + image.name);
				images.push(image);
				archive.append(fs.createReadStream(srcImageFilename), { name: dstImageFilename, store: false });
			};
			// Include static 'Built With Scripler' image for cover.
			// TODO: Maybe do detection of whether the image is actually referenced in the html
			includeStaticImage('builtwithscripler.svg', 'image/svg+xml');
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
					var stylesetContents = styleset_utils_shared.getStylesetContents(styleset, false);
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
			createHTML(docPrefix, documents, conf.epub.htmlDir, epubDir, archive, title, callback);
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
