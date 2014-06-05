var cheerio = require('cheerio');
var TOCEntry = require('../models/project.js').TOCEntry;

// TODO: move this to Document.type?
var documentTypes = {
	cover: { name: 'Cover', title: 'Cover'},
	titlepage: { name: 'TitlePage', title: 'Title Page'},
	toc: { name: 'ToC', title: 'Table of Contents'},
	colophon: { name: 'Colophon', title: 'Colophon'}
};

exports.includeInEbook = function (modelObject) {
	var result = false;
	if (modelObject) {
		if (modelObject.archived) {
			if (modelObject.archived == false) {
				result = true;
			}
		} else {
			result = true;
		}
	}
	return result;
}

exports.isSystemType = function (type) {
	return documentTypes[type] != undefined;
}

exports.getDocumentTypeName = function (type, documents) {
	return documentTypes[type].name;
}

exports.getDocumentTypeTitle = function (type, documents) {
	return documentTypes[type].title;
}

/**
 *
 * Generate a JSON representation of the input HTML for a Table of Contents (ToC): look for headings (<h[1-6]>) and anchors.
 *
 * The JSON can be used for inserting a ToC into a document, inserting an anchor into a document and inserting a ToC into an EPUB (tcc.ncx).
 *
 * NB! The headings and anchors in the input HTML are not actually child elements in HTML (XML) sense - e.g.:
 *
 * <pre>
 *	 <h1>Introduction</h1>
 *	 Some text...
 *	 <h2>More intro</h2>
 *	 More text...
 *	 <a id="99" title="anchor man" />
 *	 ...
 * </pre>
 *
 * In this example, the "h2" and "a" are not children of the "h1" but must be seen so.
 *
 * This means we cannot use cheerio's "parents()" to get an element's level.
 *
 * @param html
 * @returns {Array}
 */
exports.generateToCJSON = function (filename, html) {
	var $ = cheerio.load(html);

	// Heading rule: "h[1-6] with an id (corresponding regex: <h[1-6] id="([^"]*)">)
	var headingSelector = "h1[id][id!=''],h2[id][id!=''],h3[id][id!=''],h4[id][id!=''],h5[id][id!=''],h6[id][id!='']";

	// Anchor rule: "a" with id and title but not a href
	var anchorSelector = "a[id][title][id!=''][title!='']:not([href])";

	var selector = headingSelector + "," + anchorSelector;

	var tocEntries = [];
	var level = 0;
	var headingNumber = level;
	var previousHeadingNumber = level;
	$(selector).each(function(i, elem) {
		var id = $(this).attr('id');
		var type = elem.name;

		var text;
		if (type && type == 'a') {
			text = $(this).attr('title');
			headingNumber = level + 1; // The level of an anchor is one below its direct parent heading, so give the anchor a fake heading number to match this
		} else { // Only anchors and headings are currently supported
			text = $(this).text();
			headingNumber = type.substr(1);
		}

		var target = filename + '#' + id;

		if (headingNumber > previousHeadingNumber) {
			if (previousHeadingNumber - level > 1) {
				throw "Could not jump " + (previousHeadingNumber - headingNumber) + " levels generating JSON ToC.";
			}
			level++; // <h1>hej</h1><h5>bum</h5> => level 2, not level 5
		} else if (headingNumber < previousHeadingNumber) {
			level = previousHeadingNumber - (previousHeadingNumber - headingNumber);
		}

		var tocEntry = new TOCEntry({
			id: id,
			type: type,
			level: level,
			target: target,
			text: text
		});
		tocEntries.push(tocEntry);

		//console.log('previousHeadingNumber: ' + previousHeadingNumber + ', headingNumber: ' + headingNumber + ', level: ' + level);
		previousHeadingNumber = headingNumber;
	});

	return tocEntries;
}