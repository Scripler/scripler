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
 * Get a (heading number => calculated level) map from an array of heading numbers encountered in an HTML document, e.g.:
 *
 * <pre>
 * 	<h2>Introduction</h2>			=> level = 1
 * 	...
 * 	<h4>Popeye's Left Eye</h4>  		=> level = 3
 * 	...
 * 	<h4>Mein Gott!</h4>  			=> level = 3
 * 	...
 * 	<h6>Hola, Señor Coconut</h6>  	=> level = 4
 * 	...
 * 	<h3>Gutenberg's Drawer</h3>		=> level = 2
 * 	...
 * </pre>
 *
 * should return:
 *
 * [
 * 		{2: 1},
 * 		{3: 2},
 * 		{4: 3},
 * 		{6: 4}
 * ]
 *
 * @param headingNumbersEncountered
 */
function getHeadingNumberMap(headingNumbersEncountered) {
	headingNumbersEncountered.sort(); // Only headings up to h9 are supported - otherwise do number sorting instead of string sorting

	var headingNumberMap = [];
	for (var i=0; i<headingNumbersEncountered.length; i++) {
		var headingNumberOriginal = headingNumbersEncountered[i];
		headingNumberMap[headingNumberOriginal] = i + 1;
	}

	return headingNumberMap;
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
 * In this example, the "h2" and "a" are not children of the "h1" but must be seen as such.
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
	var headingNumber = 0;
	var headingNumbersEncountered = [];
	$(selector).each(function(i, elem) {
		var id = $(this).attr('id');
		var type = elem.name;
		var target = filename + '#' + id;

		var text;
		if (type && type == 'a') {
			text = $(this).attr('title');
			headingNumber = 1; // Dummy value; is overwritten in "post-processing" (see later in this function)
		} else { // Only anchors and headings are currently supported
			text = $(this).text();
			headingNumber = type.substr(1);
			if (headingNumbersEncountered.indexOf(headingNumber) < 0) {
				headingNumbersEncountered.push(headingNumber);
			}
		}

		var tocEntry = new TOCEntry({
			id: id,
			type: type,
			level: headingNumber, // Value is adjusted in "post-processing"
			target: target,
			text: text
		});
		tocEntries.push(tocEntry);
	});

	// Post-processing: adjust the level according to which heading numbers are actually used in the HTML
	var headingNumberMap = getHeadingNumberMap(headingNumbersEncountered);
	for (var i=0; i<tocEntries.length; i++) {
		var tocEntry = tocEntries[i];

		// The level of an anchor is one below its direct parent heading, so give the anchor a fake heading number to match this.
		// In the previous iteration, we adjusted the level of the heading, so it is safe to change the anchor's level this way (i.e. we are counting on cheerio to process the elements in the order they appear in the HTML)
		if (tocEntry.type == 'a') {
			tocEntry.level = (i > 0) ? tocEntries[i-1].level + 1 : 0;
		} else {
			tocEntry.level = headingNumberMap[tocEntry.level];
		}
	}

	return tocEntries;
}

exports.sortToCEntries = function (documents, documentToCs) {
	var sortedToCEntries = [];
	// implement solution via async.parallel() where each document ToC is calculated in parallel and then added to the correct location in a result array based on the document's position in the original "documents" array.

	for (var i=0; i<documents.length; i++) {
		var document = documents[i];
		var documentToC = documentToCs[document._id];
		Array.prototype.push.apply(sortedToCEntries, documentToC);
	}

	return sortedToCEntries;

}
