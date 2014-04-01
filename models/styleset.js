var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, Style = require('./style.js').Style
	, copyStyle = require('../models/style.js').copy;

/**
 * Styleset-Member schema
 */
var StylesetMemberSchema = new Schema({
	userId: { type: String, required: true },
	access: [
		{ type: String }
	]
}, { _id: false });

/**
 * Styleset Schema
 */
var StylesetSchema = new Schema({
	name: { type: String, required: true },
	styles: [ { type: Schema.Types.ObjectId, ref: 'Style' }],
	// Currently not used: not possible to delete a style
	deletedStyles: [ { type: Schema.Types.ObjectId, ref: 'Style' }],
	members: [StylesetMemberSchema],
	archived: { type: Boolean, default: false},
	deleted: { type: Boolean, default: false}
});

var InternalStyleset = mongoose.model('Styleset', StylesetSchema);
exports.Styleset = InternalStyleset;

exports.copy = function (styleset, next) {
	if (styleset) {
		var result = new InternalStyleset({
			name: styleset.name + ' - Copy',
			members: styleset.members,
			archived: styleset.archived
		});

		result.save(function(err) {
			if (err) {
				return next(err);
			}

			if (styleset.styles && styleset.styles.length > 0) {
				var numberOfStylesToBeApplied = styleset.styles.length;
				Style.find({"stylesetId": styleset._id}, function (err, styles) {
					styles.forEach(function (style) {
						copyStyle(style, result._id, function(err, copy) {
							if (err) {
								return next(err);
							}
							result.styles.addToSet(copy);
							numberOfStylesToBeApplied--;

							if (numberOfStylesToBeApplied == 0) {
								result.save(function(err) {
									if (err) {
										return next(err);
									}

									return next(null, result);
								});
							}
						});
					});
				});
			} else {
				return next(null, result);
			}
		});
	} else {
		return next(null, null);
	}
}
