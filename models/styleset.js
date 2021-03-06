var mongoose = require('mongoose')
	, Schema = mongoose.Schema
	, Style = require('../models/style.js').Style
	, copyStyle = require('../models/style.js').copy
	, MemberSchema = require('./member_schema').MemberSchema;

/**
 * Styleset Schema
 */
var StylesetSchema = new Schema({
	name: { type: String, required: true },
	// TODO: Embed Style instead of referencing? A style must always only be part of one styleset (copies are made at relevant times) so it seems like an obvious way to implement it.
	// See also TODO in routes/Styleset.update()
	styles: [ { type: Schema.Types.ObjectId, ref: 'Style' }],
	deletedStyles: [ { type: Schema.Types.ObjectId, ref: 'Style' }],
	members: [MemberSchema],
	archived: { type: Boolean, default: false },
	deleted: { type: Boolean, default: false },
	isSystem: { type: Boolean, default: false },
	accessLevels: [String],
	accessPayment: { type: String },
	original: { type: Schema.Types.ObjectId, ref: 'Styleset' },
	order: { type: Number }
});

var InternalStyleset = mongoose.model('Styleset', StylesetSchema);
exports.Styleset = InternalStyleset;

/**
 * Is styleset populated?
 *
 * TODO: does Mongoose provide this functionality?
 *
 * @param styleset
 * @returns {boolean}
 */
var isPopulatedPrivate = function (styleset) {
	// System stylesets do not have "members" so do not check these
	return styleset
		&& styleset._id != undefined
		&& styleset.name != undefined
		&& styleset.archived != undefined
		&& styleset.isSystem != undefined;
}

exports.isPopulated = isPopulatedPrivate;

exports.copy = function (styleset, next) {
	if (styleset) {
		if ('object' == typeof styleset) {

			/*
			console.log("Styleset.copy - name: " + styleset.name);
			console.log("Styleset.copy - members: " + styleset.members);
			console.log("Styleset.copy - archived: " + styleset.archived);
			console.log("Styleset.copy - isSystem: " + styleset.isSystem);
			console.log("Styleset.copy - original: " + styleset._id);
			console.log("Styleset.copy - order: " + styleset.order);
			*/

			if (isPopulatedPrivate(styleset)) {
				var result = new InternalStyleset({
					name: styleset.name,
					members: styleset.members,
					archived: styleset.archived,
					isSystem: styleset.isSystem,
					original: styleset._id,
					accessLevels: styleset.accessLevels,
					order: styleset.order
				});

				result.save(function(err) {
					if (err) {
						return next(err);
					}

					if (styleset.styles && styleset.styles.length > 0) {
						Style.find({"stylesetId": styleset._id}, function (err, styles) {
							var numberOfStylesToBeApplied = styles.length;
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

											//console.log("Saved styleset copy " + JSON.stringify(result));

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
				return next({message: "ERROR: styleset must be populated", status: 400});
			}
		} else {
			return next({message: "ERROR: invalid argument: must be of type \'object\'", status: 400});
		}
	} else {
		return next(null, null);
	}
}
