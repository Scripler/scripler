process.env.NODE_ENV = 'test';

var epub = require('../lib/epub')
  , epub3 = require('../lib/epub/epub3')
  , assert = require("assert")
  , shared_utils = require('../public/create/scripts/utils-shared')
  , utils = require('../lib/utils')
  , styleset_utils = require('../public/create/scripts/utils-shared')
  , project_utils = require('../lib/project-utils')
  , ObjectId = require('mongoose').Types.ObjectId
  , conf = require('config')
  , Document = require('../models/document.js').Document
  , TOCEntry = require('../models/project.js').TOCEntry
  , Image = require('../models/image.js').Image
  , _ = require("underscore");

describe('utils', function () {
	it('replaceMap', function () {
		var string = 'Doomsday devices, eh!? Now the ball is in Farnsworth\'s court!';
		var replaceMap = {
			Doomsday: 'Disco',
			devices: 'balls',
			'ball is in': 'balls are in',
			Farnsworth: 'Disco Stu'
		};
		string = utils.replaceMap(string, replaceMap);
		assert.equal('Disco balls, eh!? Now the balls are in Disco Stu\'s court!', string);

		string = 'Lots of disco balls: disco balls balls balls balls all over!';
		replaceMap = { balls: 'shoes' };
		string = utils.replaceMap(string, replaceMap);
		assert.equal('Lots of disco shoes: disco shoes shoes shoes shoes all over!', string);
	}),
	it('getNameParts', function () {
		var name = 'Jytte Andersen-Henriksen';
		var nameParts = shared_utils.getNameParts(name);
		assert.equal('Jytte', nameParts.firstname);
		assert.equal('Andersen-Henriksen', nameParts.lastname);

		name = 'Kenny';
		nameParts = shared_utils.getNameParts(name);
		assert.equal('Kenny', nameParts.firstname);
		assert.equal(undefined, nameParts.lastname);
	})
}),
describe('shared_utils', function () {
    var str1 = "4eed2d88c3dedf0d0300001a";
    var str2 = "4eed2d88c3dedf0d0300001b";
    var document1 = new Document({});
    var document2 = new Document({});
    it('getMongooseId', function () {
        assert.equal(shared_utils.getMongooseId(null), shared_utils.getMongooseId(null));
        assert.notEqual(shared_utils.getMongooseId(null), shared_utils.getMongooseId(str1));
        assert.equal(shared_utils.getMongooseId(str1), shared_utils.getMongooseId(str1));
        assert.notEqual(shared_utils.getMongooseId(str1), shared_utils.getMongooseId(str2));
        assert.equal(shared_utils.getMongooseId(str1), shared_utils.getMongooseId(new String(str1)));
        assert.notEqual(shared_utils.getMongooseId(str1), shared_utils.getMongooseId(new String(str2)));
        assert.equal(shared_utils.getMongooseId(str1), shared_utils.getMongooseId(ObjectId(str1)));
        assert.notEqual(shared_utils.getMongooseId(str1), shared_utils.getMongooseId(ObjectId(str2)));
        assert.equal(shared_utils.getMongooseId(document1._id), shared_utils.getMongooseId(document1));
        assert.notEqual(shared_utils.getMongooseId(document1._id), shared_utils.getMongooseId(document2));
    }),
    it('mongooseEquals', function () {
        assert.equal(shared_utils.mongooseEquals(null, null), true);
        assert.equal(shared_utils.mongooseEquals(null, str1), false);
        assert.equal(shared_utils.mongooseEquals(str1, str1), true);
        assert.equal(shared_utils.mongooseEquals(str1, str2), false);
        assert.equal(shared_utils.mongooseEquals(str1, new String(str1)), true);
        assert.equal(shared_utils.mongooseEquals(str1, new String(str2)), false);
        assert.equal(shared_utils.mongooseEquals(str1, ObjectId(str1)), true);
        assert.equal(shared_utils.mongooseEquals(str1, ObjectId(str2)), false);
        assert.equal(shared_utils.mongooseEquals(document1._id, document1), true);
        assert.equal(shared_utils.mongooseEquals(document1._id, document2), false);
    })
}),
describe('project-utils', function () {
	it('generateToCJSON', function () {
		var document1HTML = '<html>' +
								'<head></head>' +
								'<body>' +
									'<h1 id="id_1">Introduction</h1>' +
										'<p>Some fluffy text</p>' +
										'<h2 id="id_2">Hi</h2>' +
											'<p>Some smokey text</p>' +
											'<p>Some funky text</p>' +
											'<h3 id="id_62">A new start</h3>' +
												'<p><a id="id_hej" title="fisk" href="blabla">Some fat text</a></p>' +
										'<h2 id="id_8">Something else</h2>' +
											'<p>Some <a id="id_15" title="My Anc" />text</p>' +
									'<h1 id="id_991">Moving on</h1>' +
										'<p>Some cool text</p>' +
										'<p>Some other text</p>' +
										'<p>Some nice text</p>' +
										'<h6 id="id_3">Cool story, bro</h6>' +
											'<p>Some text</p>' +
										'<h6 id="id_27">Not too shabby</h6>' +
											'<a id="id_88" title="y0" />' +
								'</body>' +
							'</html>';

		var document1ToCEntriesJSONActual = project_utils.generateToCJSON('Document1.html', document1HTML);

		var document1ToCEntriesJSONExpected = [new TOCEntry({
			id: "id_1",
			type: "h1",
			level: 1,
			target: "Document1.html#" + conf.epub.anchorIdPrefix + "1",
			text: "Introduction"
		}), new TOCEntry({
			"id": "id_2",
			"type": "h2",
			"level": 2,
			"target": "Document1.html#" + conf.epub.anchorIdPrefix + "2",
			"text": "Hi"
		}), new TOCEntry({
			"id": "id_62",
			"type": "h3",
			"level": 3,
			"target": "Document1.html#" + conf.epub.anchorIdPrefix + "62",
			"text": "A new start"
		}), new TOCEntry({
			"id": "id_8",
			"type": "h2",
			"level": 2,
			"target": "Document1.html#" + conf.epub.anchorIdPrefix + "8",
			"text": "Something else"
		}), new TOCEntry({
			"id": "id_15",
			"type": "a",
			"level": 3,
			"target": "Document1.html#" + conf.epub.anchorIdPrefix + "15",
			"text": "My Anc"
		}), new TOCEntry({
			"id": "id_991",
			"type": "h1",
			"level": 1,
			"target": "Document1.html#" + conf.epub.anchorIdPrefix + "991",
			"text": "Moving on"
		}), new TOCEntry({
			"id": "id_3",
			"type": "h6",
			"level": 4,
			"target": "Document1.html#" + conf.epub.anchorIdPrefix + "3",
			"text": "Cool story, bro"
		}), new TOCEntry({
			"id": "id_27",
			"type": "h6",
			"level": 4,
			"target": "Document1.html#" + conf.epub.anchorIdPrefix + "27",
			"text": "Not too shabby"
		}), new TOCEntry({
			"id": "id_88",
			"type": "a",
			"level": 5,
			"target": "Document1.html#" + conf.epub.anchorIdPrefix + "88",
			"text": "y0"
		})];

		/*
		  This...is...horrible: if we don't use JSON.stringify(), the arrays won't be equal.

		  The following comparison methods were UNSUCCESSFULLY tried:
		    * assert.deepEqual()
		    * _.isEqual()
		    * A custom function that called one of the above for each element
		 */
		assert.equal(JSON.stringify(document1ToCEntriesJSONActual), JSON.stringify(document1ToCEntriesJSONExpected));

		var document2HTML = '<html>' +
								'<head></head>' +
								'<body>' +
										'<h2 id="id_741">Introduction</h2>' +
												'<p>Some smokey text</p>' +
												'<h4 id="id_90">Popeye\'s Left Eye</h4>' +
													'<p>Some smokey text</p>' +
												'<h4 id="id_10">Mein Gott!</h4> ' +
													'<p>Some smokey text</p>' +
													'<h6 id="id_666">Hola, Señor Coconut</h6>' +
														'<p>Some smokey text</p>' +
											'<h3 id="id_32">Gutenberg\'s Drawer</h3>' +
												'<p>Some <a id="id_101" title="Anchor1" />Omar</p>' +
												'<p>Some <a id="id_109" title="Anchor2" />Pontus</p>' +
										'<p>Some smokey text</p>'
								'</body>' +
							'</html>';

		var document2ToCEntriesJSONActual = project_utils.generateToCJSON('Document2.html', document2HTML);

		var document2ToCEntriesJSONExpected = [new TOCEntry({
			id: "id_741",
			type: "h2",
			level: 1,
			target: "Document2.html#" + conf.epub.anchorIdPrefix + "741",
			text: "Introduction"
		}), new TOCEntry({
			"id": "id_90",
			"type": "h4",
			"level": 3,
			"target": "Document2.html#" + conf.epub.anchorIdPrefix + "90",
			"text": "Popeye's Left Eye"
		}), new TOCEntry({
			"id": "id_10",
			"type": "h4",
			"level": 3,
			"target": "Document2.html#" + conf.epub.anchorIdPrefix + "10",
			"text": "Mein Gott!"
		}), new TOCEntry({
			"id": "id_666",
			"type": "h6",
			"level": 4,
			"target": "Document2.html#" + conf.epub.anchorIdPrefix + "666",
			"text": "Hola, Señor Coconut"
		}), new TOCEntry({
			"id": "id_32",
			"type": "h3",
			"level": 2,
			"target": "Document2.html#" + conf.epub.anchorIdPrefix + "32",
			"text": "Gutenberg's Drawer"
		}), new TOCEntry({
			"id": "id_101",
			"type": "a",
			"level": 3,
			"target": "Document2.html#" + conf.epub.anchorIdPrefix + "101",
			"text": "Anchor1"
		}), new TOCEntry({
			"id": "id_109",
			"type": "a",
			"level": 3,
			"target": "Document2.html#" + conf.epub.anchorIdPrefix + "109",
			"text": "Anchor2"
		})];

		// Same comment as above
		assert.equal(JSON.stringify(document2ToCEntriesJSONActual), JSON.stringify(document2ToCEntriesJSONExpected));
	})
}),
describe('epub', function () {
	it('getCloseNavPointsString', function () {
		var result = epub.getCloseNavPointsString(0, 0, 4);
		assert.equal(result, 	'    </navPoint>\r\n');

		result = epub.getCloseNavPointsString(0, 1, 4);
		assert.equal(result, 	'        </navPoint>\r\n' +
								'    </navPoint>\r\n');

		result = epub.getCloseNavPointsString(0, 2, 4);
		assert.equal(result, 	'            </navPoint>\r\n' +
								'        </navPoint>\r\n' +
								'    </navPoint>\r\n');

		result = epub.getCloseNavPointsString(0, 3, 4);
		assert.equal(result, 	'                </navPoint>\r\n' +
								'            </navPoint>\r\n' +
								'        </navPoint>\r\n' +
								'    </navPoint>\r\n');

		result = epub.getCloseNavPointsString(1, 2, 4);
		assert.equal(result, 	'        </navPoint>\r\n' +
								'    </navPoint>\r\n');

		result = epub.getCloseNavPointsString(1, 0, 4);
		assert.equal(result, '');
	}),
	it('getNavPointsString', function () {
		var tocEntries = [];
		var result = epub.getNavPointsString(tocEntries);
		assert.equal(result, '');

		var tocEntry1 = new TOCEntry;
		tocEntry1.text = 'Kapitel Einz';
		tocEntry1.target = 'Kapitel Einz.html';
		tocEntry1.level = 0;

		tocEntries = [tocEntry1];
		result = epub.getNavPointsString(tocEntries);
		assert.equal(result, '\r\n    <navPoint id="navpoint-1" playOrder="1"><navLabel><text>' + tocEntry1.text + '</text></navLabel><content src="HTML/' + tocEntry1.target + '"/>\r\n    </navPoint>\r\n');

		var tocEntry2 = new TOCEntry;
		tocEntry2.text = 'Kapitel Zwei';
		tocEntry2.target = 'Kapitel Zwei.html';
		tocEntry2.level = 1;

		tocEntries = [tocEntry1, tocEntry2];
		result = epub.getNavPointsString(tocEntries);
		assert.equal(result, 	'\r\n' +
								'    <navPoint id="navpoint-1" playOrder="1"><navLabel><text>' + tocEntry1.text + '</text></navLabel><content src="HTML/' + tocEntry1.target + '"/>\r\n' +
								'        <navPoint id="navpoint-2" playOrder="2"><navLabel><text>' + tocEntry2.text + '</text></navLabel><content src="HTML/' + tocEntry2.target + '"/>\r\n' +
								'        </navPoint>\r\n' +
								'    </navPoint>\r\n');

		var tocEntry3 = new TOCEntry;
		tocEntry3.text = 'Kapitel Drei';
		tocEntry3.target = 'Kapitel Drei.html';
		tocEntry3.level = 0;

		tocEntries = [tocEntry1, tocEntry2, tocEntry3];
		result = epub.getNavPointsString(tocEntries);
		assert.equal(result, 	'\r\n' +
								'    <navPoint id="navpoint-1" playOrder="1"><navLabel><text>' + tocEntry1.text + '</text></navLabel><content src="HTML/' + tocEntry1.target + '"/>\r\n' +
								'        <navPoint id="navpoint-2" playOrder="2"><navLabel><text>' + tocEntry2.text + '</text></navLabel><content src="HTML/' + tocEntry2.target + '"/>\r\n' +
								'        </navPoint>\r\n' +
								'    </navPoint>\r\n' +
								'\r\n' +
								'    <navPoint id="navpoint-3" playOrder="3"><navLabel><text>' + tocEntry3.text + '</text></navLabel><content src="HTML/' + tocEntry3.target + '"/>\r\n' +
								'    </navPoint>\r\n');
	}),
	it('getManifestHtmlFilesString', function () {
		var folderName = 'HTML';
		var prefix = conf.epub.documentPrefix;

		var htmlFiles = [];
		var result = epub.getManifestFilesString(prefix, folderName, htmlFiles);
		assert.equal(result, '');

		var document1 = new Document;
		document1.fileExtension = 'html';
		document1.mediaType = 'application/xhtml+xml';
		document1.archived = false;

		htmlFiles = [document1];
		result = epub.getManifestFilesString(prefix, folderName, htmlFiles);
		assert.equal(result, '    <item id="' + prefix + document1.id + '.html" href="HTML/' + prefix + document1.id + '.html" media-type="application/xhtml+xml" />\r\n');

		var document2 = new Document;
		document2.fileExtension = 'html';
		document2.mediaType = 'application/xhtml+xml';
		document2.archived = false;

		htmlFiles = [document1, document2];
		result = epub.getManifestFilesString(prefix, folderName, htmlFiles, 'html', 'application/xhtml+xml');
		assert.equal(result, '    <item id="' + prefix + document1.id + '.html" href="HTML/' + prefix + document1.id + '.html" media-type="application/xhtml+xml" />\r\n' +
			'    <item id="' + prefix + document2.id + '.html" href="HTML/' + prefix + document2.id + '.html" media-type="application/xhtml+xml" />\r\n');
	}),
	it('getManifestImageFilesString', function () {
		var folderName = 'Images';
		var prefix = conf.epub.imagePrefix;

		var images = [];
		var result = epub.getManifestFilesString(prefix, folderName, images);
		assert.equal(result, '');

		var image1 = new Image({
			name: "frontpage.jpg",
			fileExtension: "jpg",
			mediaType: "image/jpeg"
		});

		images = [image1];

		var result = epub.getManifestFilesString(prefix, folderName, images);
		assert.equal(result, '    <item id="img_frontpage.jpg" href="Images/img_frontpage.jpg" media-type="image/jpeg" />\r\n');

		var image2 = new Image({
			name: "fun_image.png",
			fileExtension: "png",
			mediaType: "image/png"
		});

		images = [image1, image2];
		var result = epub.getManifestFilesString(prefix, folderName, images);
		assert.equal(result, '    <item id="img_frontpage.jpg" href="Images/img_frontpage.jpg" media-type="image/jpeg" />\r\n' +
			'    <item id="img_fun_image.png" href="Images/img_fun_image.png" media-type="image/png" />\r\n');
	}),
	it('getManifestFontFilesString', function () {
		var folderName = 'Fonts';
		var prefix = conf.epub.fontPrefix;

		var fonts = [];
		var result = epub.getManifestFilesString(prefix, folderName, fonts);
		assert.equal(result, '');

		var font1 = {
			"id": "font_Scripler1.ttf",
			"fileExtension": "ttf",
			"mediaType": "application/x-font-ttf"
		};

		fonts = [font1];
		var result = epub.getManifestFilesString(prefix, folderName, fonts);
		assert.equal(result, '    <item id="font_Scripler1.ttf" href="Fonts/font_Scripler1.ttf" media-type="application/x-font-ttf" />\r\n');

		var font2 = {
			"id": "font_Scrupler33.ttf",
			"fileExtension": "ttf",
			"mediaType": "application/x-font-ttf"
		};

		fonts = [font1, font2];
		var result = epub.getManifestFilesString(prefix, folderName, fonts);
		assert.equal(result, '    <item id="font_Scripler1.ttf" href="Fonts/font_Scripler1.ttf" media-type="application/x-font-ttf" />\r\n' +
			'    <item id="font_Scrupler33.ttf" href="Fonts/font_Scrupler33.ttf" media-type="application/x-font-ttf" />\r\n');
	}),
	it('getSpineDocumentsString', function () {
		var htmlFiles = [];
		var prefix = 'doc_';

		var result = epub.getSpineDocumentsString(prefix, htmlFiles, 'html');
		assert.equal(result, '');

		var htmlFile1 = new Document;

		htmlFiles = [htmlFile1];
		var result = epub.getSpineDocumentsString(prefix, htmlFiles, 'html');
		assert.equal(result, '    <itemref idref="' + prefix + htmlFile1.id + '.html" />\r\n');

		var htmlFile2 = new Document;
		htmlFile2.type = 'titlepage';

		htmlFiles = [htmlFile1, htmlFile2];
		var result = epub.getSpineDocumentsString(prefix, htmlFiles, 'html');
		assert.equal(result, '    <itemref idref="' + prefix + htmlFile1.id + '.html" />\r\n' +
			'    <itemref idref="TitlePage.html" />\r\n');
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
	}),
    it('getStylesetContents', function () {
        var styleset = {
            _id: "abc123",
            name:   "StyleSet test",
            styles: [
                {_id: "xxx123", name: "Style 1", tag: "h1", css: {
	                    "font-weight": "11px",
	                    "color":       "red"
                	}
                },
                {_id: "yyy123", name: "Style 2", class:"testclass", css: {
	                    "margin-left": "5px",
	                    "color":       "green"
	                }
                },
                {_id: "zzz123", name: "Style 3", class:"anotherclass", tag: "p", css: {
	                    "color":       "black"
	                }
                }
            ]
        }

        //Generate default styleset CSS
        var stylesetContents = styleset_utils.getStylesetContents(styleset, true);
        stylesetContents = stylesetContents.replace(/[\n\r]+/g, "|");
        assert.equal(stylesetContents, 
        		'h1, .style-xxx123 {|font-weight: 11px;|color: red;|}|'+
        		'.testclass, .style-yyy123 {|margin-left: 5px;|color: green;|}|'+
        		'p.anotherclass, .style-zzz123 {|color: black;|}|');

        //Generate non-default styleset CSS
        stylesetContents = styleset_utils.getStylesetContents(styleset, false);
        stylesetContents = stylesetContents.replace(/[\n\r]+/g, "|");
        assert.equal(stylesetContents, 
        		'.styleset-abc123 h1, .style-xxx123 {|font-weight: 11px;|color: red;|}|'+
        		'.testclass, .style-yyy123 {|margin-left: 5px;|color: green;|}|'+
        		'.styleset-abc123 p.anotherclass, .style-zzz123 {|color: black;|}|');
    })
}),
describe('epub3', function () {
	it('getTocString', function () {
		var tocEntries = [];
		var result = epub3.getTocString(tocEntries);
		assert.equal(result, '');

		var tocEntry1 = new TOCEntry;
		tocEntry1.text = 'Kapitel Einz';
		tocEntry1.target = 'Kapitel Einz.html';
		tocEntry1.level = 0;

		tocEntries = [tocEntry1];
		result = epub3.getTocString(tocEntries);
		assert.equal(result, '        <li><a href="HTML/Kapitel Einz.html">Kapitel Einz</a></li>\r\n');

		var tocEntry2 = new TOCEntry;
		tocEntry2.text = 'Kapitel Zwei';
		tocEntry2.target = 'Kapitel Zwei.html';
		tocEntry2.level = 1;

		tocEntries = [tocEntry1, tocEntry2];
		result = epub3.getTocString(tocEntries);
		assert.equal(result, '        <li><a href="HTML/Kapitel Einz.html">Kapitel Einz</a></li>\r\n' +
			                 '        <li><a href="HTML/Kapitel Zwei.html">Kapitel Zwei</a></li>\r\n');

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
	}),
	it('getStylesetLinks', function () {
		var document = new Document;

		var result = epub.getStylesetLinks(document);
		assert.equal(result, '<link href="../Styles/non-editable.css" rel="stylesheet" type="text/css"/>');

		var stylesetId1 = shared_utils.getMongooseId(ObjectId("4eec2d66c3dedf0d0300001a"));
		document.stylesets.addToSet(ObjectId(stylesetId1));
		result = epub.getStylesetLinks(document);
		assert.equal(result, '<link href="../Styles/non-editable.css" rel="stylesheet" type="text/css"/><link href="../Styles/style_4eec2d66c3dedf0d0300001a.css" rel="stylesheet" type="text/css"/>');

		var stylesetId2 = shared_utils.getMongooseId(ObjectId("99ec2d66c3dedf0d0300002b"));
		document.stylesets.addToSet(ObjectId(stylesetId2));
		result = epub.getStylesetLinks(document);
		assert.equal(result, '<link href="../Styles/non-editable.css" rel="stylesheet" type="text/css"/><link href="../Styles/style_4eec2d66c3dedf0d0300001a.css" rel="stylesheet" type="text/css"/><link href="../Styles/style_99ec2d66c3dedf0d0300002b.css" rel="stylesheet" type="text/css"/>');
	})
});
