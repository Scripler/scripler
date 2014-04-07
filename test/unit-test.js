process.env.NODE_ENV = 'test';

var epub = require('../lib/epub')
  , epub3 = require('../lib/epub/epub3')
  , assert = require("assert")
  , TOCEntry = require('../models/project.js').TOCEntry
  , Document = require('../models/document.js').Document;

describe('epub', function () {
	it('getCloseNavPointsString', function () {
		var result = epub.getCloseNavPointsString(0, 0);
		assert.equal(result, '</navPoint>');

		result = epub.getCloseNavPointsString(0, 1);
		assert.equal(result, '</navPoint></navPoint>');

		result = epub.getCloseNavPointsString(0, 2);
		assert.equal(result, '</navPoint></navPoint></navPoint>');

		result = epub.getCloseNavPointsString(0, 3);
		assert.equal(result, '</navPoint></navPoint></navPoint></navPoint>');

		result = epub.getCloseNavPointsString(1, 2);
		assert.equal(result, '</navPoint></navPoint>');

		result = epub.getCloseNavPointsString(1, 0);
		assert.equal(result, '');
	}),
	it('getNavPointsString', function () {
		var tocEntries = [];
		var result = epub.getNavPointsString(tocEntries);
		assert.equal(result, '');

		var tocEntry1 = new TOCEntry;
		tocEntry1.title = 'Kapitel Einz';
		tocEntry1.target = 'Kapitel Einz.html';
		tocEntry1.level = 0;

		tocEntries = [tocEntry1];
		result = epub.getNavPointsString(tocEntries);
		assert.equal(result, '<navPoint id="navpoint-1" playOrder="1">' +
			'<navLabel>' +
			'<text>' + tocEntry1.title + '</text>' +
			'</navLabel>' +
			'<content src="' + tocEntry1.target + '"/>' +
			'</navPoint>');

		var tocEntry2 = new TOCEntry;
		tocEntry2.title = 'Kapitel Zwei';
		tocEntry2.target = 'Kapitel Zwei.html';
		tocEntry2.level = 1;

		tocEntries = [tocEntry1, tocEntry2];
		result = epub.getNavPointsString(tocEntries);
		assert.equal(result, '<navPoint id="navpoint-1" playOrder="1">' +
			'<navLabel>' +
			'<text>' + tocEntry1.title + '</text>' +
			'</navLabel>' +
			'<content src="' + tocEntry1.target + '"/>' +
			'<navPoint id="navpoint-2" playOrder="2">' +
			'<navLabel>' +
			'<text>' + tocEntry2.title + '</text>' +
			'</navLabel>' +
			'<content src="' + tocEntry2.target + '"/>' +
			'</navPoint>' +
			'</navPoint>');

		var tocEntry3 = new TOCEntry;
		tocEntry3.title = 'Kapitel Drei';
		tocEntry3.target = 'Kapitel Drei.html';
		tocEntry3.level = 0;

		tocEntries = [tocEntry1, tocEntry2, tocEntry3];
		result = epub.getNavPointsString(tocEntries);
		assert.equal(result, '<navPoint id="navpoint-1" playOrder="1">' +
			'<navLabel>' +
			'<text>' + tocEntry1.title + '</text>' +
			'</navLabel>' +
			'<content src="' + tocEntry1.target + '"/>' +
			'<navPoint id="navpoint-2" playOrder="2">' +
			'<navLabel>' +
			'<text>' + tocEntry2.title + '</text>' +
			'</navLabel>' +
			'<content src="' + tocEntry2.target + '"/>' +
			'</navPoint>' +
			'</navPoint>' +
			'<navPoint id="navpoint-3" playOrder="3">' +
			'<navLabel>' +
			'<text>' + tocEntry3.title + '</text>' +
			'</navLabel>' +
			'<content src="' + tocEntry3.target + '"/>' +
			'</navPoint>');
	}),
	it('getManifestHtmlFilesString', function () {
		var folderName = 'HTML';
		var prefix = 'doc_';

		var htmlFiles = [];
		var result = epub.getManifestFilesString(prefix, folderName, htmlFiles);
		assert.equal(result, '');

		var document1 = new Document;
		document1.fileExtension = 'html';
		document1.mediaType = 'application/xhtml+xml';
		document1.archived = false;

		htmlFiles = [document1];
		result = epub.getManifestFilesString(prefix, folderName, htmlFiles);
		assert.equal(result, '<item id="' + prefix + document1.id + '.html" href="HTML/' + prefix + document1.id + '.html" media-type="application/xhtml+xml" />');

		var document2 = new Document;
		document2.fileExtension = 'html';
		document2.mediaType = 'application/xhtml+xml';
		document2.archived = false;

		htmlFiles = [document1, document2];
		result = epub.getManifestFilesString(prefix, folderName, htmlFiles, 'html', 'application/xhtml+xml');
		assert.equal(result, '<item id="' + prefix + document1.id + '.html" href="HTML/' + prefix + document1.id + '.html" media-type="application/xhtml+xml" />' +
			'<item id="' + prefix + document2.id + '.html" href="HTML/' + prefix + document2.id + '.html" media-type="application/xhtml+xml" />');
	}),
	it('getManifestImageFilesString', function () {
		var folderName = 'Images';
		var prefix = 'img_';

		var images = [];
		var result = epub.getManifestFilesString(prefix, folderName, images);
		assert.equal(result, '');

		var image1 = {
			"name": "img_frontpage.jpg",
			"fileExtension": "jpg",
			"mediaType": "image/jpeg"
		};

		images = [image1];

		var result = epub.getManifestFilesString(prefix, folderName, images);
		assert.equal(result, '<item id="img_frontpage.jpg" href="Images/img_frontpage.jpg" media-type="image/jpeg" />');

		var image2 = {
			"name": "img_fun_image.png",
			"fileExtension": "png",
			"mediaType": "image/png"
		};

		images = [image1, image2];
		var result = epub.getManifestFilesString(prefix, folderName, images);
		assert.equal(result, '<item id="img_frontpage.jpg" href="Images/img_frontpage.jpg" media-type="image/jpeg" />' +
			'<item id="img_fun_image.png" href="Images/img_fun_image.png" media-type="image/png" />');
	}),
	it('getManifestFontFilesString', function () {
		var folderName = 'Fonts';
		var prefix = 'font_';

		var fonts = [];
		var result = epub.getManifestFilesString(prefix, folderName, fonts);
		assert.equal(result, '');

		var font1 = {
			"name": "font_Scripler1.ttf",
			"fileExtension": "ttf",
			"mediaType": "application/x-font-ttf"
		};

		fonts = [font1];
		var result = epub.getManifestFilesString(prefix, folderName, fonts);
		assert.equal(result, '<item id="font_Scripler1.ttf" href="Fonts/font_Scripler1.ttf" media-type="application/x-font-ttf" />');

		var font2 = {
			"name": "font_Scrupler33.ttf",
			"fileExtension": "ttf",
			"mediaType": "application/x-font-ttf"
		};

		fonts = [font1, font2];
		var result = epub.getManifestFilesString(prefix, folderName, fonts);
		assert.equal(result, '<item id="font_Scripler1.ttf" href="Fonts/font_Scripler1.ttf" media-type="application/x-font-ttf" />' +
			'<item id="font_Scrupler33.ttf" href="Fonts/font_Scrupler33.ttf" media-type="application/x-font-ttf" />');
	}),
	it('getSpineDocumentsString', function () {
		var htmlFiles = [];
		var prefix = 'doc_';

		var result = epub.getSpineDocumentsString(prefix, htmlFiles, 'html');
		assert.equal(result, '');

		var htmlFile1 = new Document;

		htmlFiles = [htmlFile1];
		var result = epub.getSpineDocumentsString(prefix, htmlFiles, 'html');
		assert.equal(result, '<itemref idref="' + prefix + htmlFile1.id + '.html" />');

		var htmlFile2 = new Document;
		htmlFile2.type = 'titlepage';

		htmlFiles = [htmlFile1, htmlFile2];
		var result = epub.getSpineDocumentsString(prefix, htmlFiles, 'html');
		assert.equal(result, '<itemref idref="' + prefix + htmlFile1.id + '.html" />' +
			'<itemref idref="TitlePage.html" />');
	}),
	it('getGuideString', function () {
		var documents = [];

		var document1 = new Document;
		document1.type = 'cover';

		var document2 = new Document;
		document2.type = 'disco';

		var document3 = new Document;
		document3.type = 'titlepage';

		var document4 = new Document;
		document4.type = 'stew';

		var document5 = new Document;
		document5.type = 'toc';

		var document6 = new Document;
		document6.type = 'colophon';

		documents = [document1, document2, document3, document4, document5, document6];

		var result = epub.getGuideString('cover', documents);
		assert.equal(result, '<reference href="HTML/Cover.html" title="Cover" type="cover" />');

		var result = epub.getGuideString('titlepage', documents);
		assert.equal(result, '<reference href="HTML/TitlePage.html" title="Title Page" type="titlepage" />');

		var result = epub.getGuideString('toc', documents);
		assert.equal(result, '<reference href="HTML/ToC.html" title="Table of Contents" type="toc" />');

		var result = epub.getGuideString('colophon', documents);
		assert.equal(result, '<reference href="HTML/Colophon.html" title="Colophon" type="colophon" />');
	})
}),
describe('epub3', function () {
	it('getTocString', function () {
		var tocEntries = [];
		var result = epub3.getTocString(tocEntries);
		assert.equal(result, '');

		var tocEntry1 = new TOCEntry;
		tocEntry1.title = 'Kapitel Einz';
		tocEntry1.target = 'Kapitel Einz.html';
		tocEntry1.level = 0;

		tocEntries = [tocEntry1];
		result = epub3.getTocString(tocEntries);
		assert.equal(result, '<li><a href="Kapitel Einz.html">Kapitel Einz</a></li>');

		var tocEntry2 = new TOCEntry;
		tocEntry2.title = 'Kapitel Zwei';
		tocEntry2.target = 'Kapitel Zwei.html';
		tocEntry2.level = 1;

		tocEntries = [tocEntry1, tocEntry2];
		result = epub3.getTocString(tocEntries);
		assert.equal(result, '<li><a href="Kapitel Einz.html">Kapitel Einz</a></li><li><a href="Kapitel Zwei.html">Kapitel Zwei</a></li>');

	}),
	it('getLandmarkString', function () {
		var documents = [];

		var document1 = new Document;
		document1.type = 'cover';

		var document2 = new Document;
		document2.type = 'disco';

		var document3 = new Document;
		document3.type = 'titlepage';

		var document4 = new Document;
		document4.type = 'stew';

		var document5 = new Document;
		document5.type = 'toc';

		var document6 = new Document;
		document6.type = 'colophon';

		documents = [document1, document2, document3, document4, document5, document6];

		var result = epub3.getLandmarkString('cover', documents);
		assert.equal(result, '<li><a epub:type="cover" href="HTML/Cover.html">Cover</a></li>');

		var result = epub3.getLandmarkString('titlepage', documents);
		assert.equal(result, '<li><a epub:type="titlepage" href="HTML/TitlePage.html">Title Page</a></li>');

		var result = epub3.getLandmarkString('toc', documents);
		assert.equal(result, '<li><a epub:type="toc" href="HTML/ToC.html">Table of Contents</a></li>');

		var result = epub3.getLandmarkString('colophon', documents);
		assert.equal(result, '<li><a epub:type="colophon" href="HTML/Colophon.html">Colophon</a></li>');
	})
});
