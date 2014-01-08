var epub2 = require('../lib/epub/epub2/epub2')
  , assert = require("assert")
  , TOCEntry = require('../models/project.js').TOCEntry
  , Document = require('../models/document.js').Document;

// TODO: will manifest file (HTML, images, fonts) properties be located on Document?
ManifestFile = function (id, mediaType) {
	this.id = id;
	this.mediaType = mediaType;
};

describe('epub2', function () {
    it('getCloseNavPointsString', function () {
        var result = epub2.getCloseNavPointsString(0, 0);
        assert.equal(result, '</navPoint>');

        result = epub2.getCloseNavPointsString(0, 1);
        assert.equal(result, '</navPoint></navPoint>');

        result = epub2.getCloseNavPointsString(0, 2);
        assert.equal(result, '</navPoint></navPoint></navPoint>');

        result = epub2.getCloseNavPointsString(0, 3);
        assert.equal(result, '</navPoint></navPoint></navPoint></navPoint>');

        result = epub2.getCloseNavPointsString(1, 2);
        assert.equal(result, '</navPoint></navPoint>');

        result = epub2.getCloseNavPointsString(1, 0);
        assert.equal(result, '');
    }),
    it('getNavPointsString', function () {
        var tocEntries = [];
        var result = epub2.getNavPointsString(tocEntries);
        assert.equal(result, '');

        var tocEntry1 = new TOCEntry;
        tocEntry1.title = 'Kapitel Einz';
        tocEntry1.target = 'Kapitel Einz.html';
        tocEntry1.level = 0;

        tocEntries = [tocEntry1];
        result = epub2.getNavPointsString(tocEntries);
        assert.equal(result,    '<navPoint id="navpoint-1" playOrder="1">' +
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
        result = epub2.getNavPointsString(tocEntries);
        assert.equal(result,    '<navPoint id="navpoint-1" playOrder="1">' +
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
        result = epub2.getNavPointsString(tocEntries);
		assert.equal(result,	'<navPoint id="navpoint-1" playOrder="1">' +
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
		var result = epub2.getManifestFilesString(prefix, folderName, htmlFiles, 'html', 'application/xhtml+xml');
		assert.equal(result, '');

		var document1 = new Document;
		//document1.id = 'Doc1.html';
		//htmlFile1.mediaType = 'application/xhtml+xml';

	    htmlFiles = [document1];
	    result = epub2.getManifestFilesString(prefix, folderName, htmlFiles, 'html', 'application/xhtml+xml');
	    assert.equal(result, '<item id="' + prefix + document1.id + '.html" href="HTML/' + prefix + document1.id + '.html" media-type="application/xhtml+xml" />\n');

		var document2 = new Document;
		//htmlFile2.id = 'Doc2.html';
		//htmlFile2.mediaType = 'application/xhtml+xml';

	    htmlFiles = [document1, document2];
	    result = epub2.getManifestFilesString(prefix, folderName, htmlFiles, 'html', 'application/xhtml+xml');
	    assert.equal(result, '<item id="' + prefix + document1.id + '.html" href="HTML/' + prefix + document1.id + '.html" media-type="application/xhtml+xml" />\n' +
							 '<item id="' + prefix + document2.id + '.html" href="HTML/' + prefix + document2.id + '.html" media-type="application/xhtml+xml" />\n');
    }),
    it('getManifestImageFilesString', function () {
		var folderName = 'Images';
		var prefix = 'img_';

		var images = [];
		var result = epub2.getManifestFilesString(prefix, folderName, images, 'jpg', 'image/jpeg');
		assert.equal(result, '');

		var image1 = new ManifestFile;
		image1.id = 'frontpage';
		//image1.mediaType = 'image/jpeg';

		images = [image1];
		var result = epub2.getManifestFilesString(prefix, folderName, images, 'jpg', 'image/jpeg');
		assert.equal(result, '<item id="img_frontpage.jpg" href="Images/img_frontpage.jpg" media-type="image/jpeg" />\n');

		var image2 = new ManifestFile;
		image2.id = 'fun_image';
		//image2.mediaType = 'image/png';

		images = [image1, image2];
		var result = epub2.getManifestFilesString(prefix, folderName, images, 'jpg', 'image/jpeg');
		assert.equal(result, 	'<item id="img_frontpage.jpg" href="Images/img_frontpage.jpg" media-type="image/jpeg" />\n' +
								'<item id="img_fun_image.jpg" href="Images/img_fun_image.jpg" media-type="image/jpeg" />\n');
	}),
    it('getManifestFontFilesString', function () {
		var folderName = 'Fonts';
		var prefix = 'font_';

		var fonts = [];
		var result = epub2.getManifestFilesString(prefix, folderName, fonts, 'ttf', 'application/x-font-ttf');
		assert.equal(result, '');

		var font1 = new ManifestFile;
		font1.id = 'Scripler1';
		//font1.mediaType = 'application/x-font-ttf';

		fonts = [font1];
		var result = epub2.getManifestFilesString(prefix, folderName, fonts, 'ttf', 'application/x-font-ttf');
		assert.equal(result, '<item id="font_Scripler1.ttf" href="Fonts/font_Scripler1.ttf" media-type="application/x-font-ttf" />\n');

		var font2 = new ManifestFile;
		font2.id = 'Scrupler33';
		//font2.mediaType = 'application/x-font-ttf';

		fonts = [font1, font2];
		var result = epub2.getManifestFilesString(prefix, folderName, fonts, 'ttf', 'application/x-font-ttf');
		assert.equal(result, 	'<item id="font_Scripler1.ttf" href="Fonts/font_Scripler1.ttf" media-type="application/x-font-ttf" />\n' +
								'<item id="font_Scrupler33.ttf" href="Fonts/font_Scrupler33.ttf" media-type="application/x-font-ttf" />\n');
    }),
    it('getSpineDocumentsString', function () {
		var htmlFiles = [];
		var prefix = 'doc_';

		var result = epub2.getSpineDocumentsString(prefix, htmlFiles, 'html');
		assert.equal(result, '');

		var htmlFile1 = new ManifestFile;
		htmlFile1.id = 'Doc1';

		htmlFiles = [htmlFile1];
		var result = epub2.getSpineDocumentsString(prefix, htmlFiles, 'html');
		assert.equal(result, '<itemref idref="doc_Doc1.html" />\n');

		var htmlFile2 = new ManifestFile;
		htmlFile2.id = 'Doc2';
		htmlFile2.type = 'TitlePage';

		htmlFiles = [htmlFile1, htmlFile2];
		var result = epub2.getSpineDocumentsString(prefix, htmlFiles, 'html');
		assert.equal(result, 	'<itemref idref="doc_Doc1.html" />\n' +
								'<itemref idref="TitlePage.html" />\n');
    });
});
