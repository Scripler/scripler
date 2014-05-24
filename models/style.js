var mongoose = require('mongoose')
	, Schema = mongoose.Schema;

/**
 * Style-Member schema
 */
var StyleMemberSchema = new Schema({
	userId: { type: String, required: true },
	access: [
		{ type: String }
	]
}, { _id: false });

/**
 * Style Schema
 */
var StyleSchema = new Schema({
	name: { type: String, required: true },
	class: { type: String },
	css: { type: String },
	tag: { type: String },
	stylesetId: { type: Schema.Types.ObjectId, ref: 'Styleset', required: true },
	members: [StyleMemberSchema],
	archived: { type: Boolean, default: false },
	deleted: { type: Boolean, default: false },
	isSystem: { type: Boolean, default: false },
	original: { type: Schema.Types.ObjectId, ref: 'Style' }
});

var InternalStyle = mongoose.model('Style', StyleSchema);
exports.Style = InternalStyle;

/**
 * Is style populated?
 *
 * TODO: does Mongoose provide this functionality?
 *
 * @param style
 * @returns {boolean}
 */
var isPopulatedPrivate = function (style) {
	// "members" are not defined for system styles, so don't check them
	// "tag" is optional, so don't check it
	return style
		&& style._id != undefined
		&& style.name != undefined
		&& style.archived != undefined;
}

exports.isPopulated = isPopulatedPrivate;

exports.copy = function (style, newStylesetId, next) {
	if (style) {
		// TODO: why is the Mongoose model object id, newStylesetId, an object here but a string in utils.containsIdPrivate()?
		// See: http://stackoverflow.com/questions/15724272/mongoose-and-node-js-id-and-id
		if ('object' == typeof style && 'object' == typeof newStylesetId) {

			/*
			console.log("Style.copy - name: " + style.name);
			console.log("Style.copy - class: " + style.class);
			console.log("Style.copy - css: " + style.css);
			console.log("Style.copy - tag: " + style.tag);
			console.log("Style.copy - members: " + style.members);
			console.log("Style.copy - archived: " + style.archived);
			console.log("Style.copy - isSystem: " + style.isSystem);
			console.log("Style.copy - original: " + style._id);
			*/

			if (isPopulatedPrivate(style)) {
				var result = new InternalStyle({
					name: style.name,
					class: style.class,
					css: style.css,
					tag: style.tag,
					stylesetId: newStylesetId,
					members: style.members,
					archived: style.archived,
					isSystem: style.isSystem,
					original: style._id
				});

				result.save(function (err) {
					if (err) {
						return next(err);
					}

					//console.log("Saved style copy " + result);

					return next(null, result);
				});
			} else {
				return next("ERROR: style must be populated");
			}
		} else {
			return next("ERROR: invalid arguments: must be of type \'object\' and 'string' (Mongoose model object id)");
		}
	} else {
		return next(null, null);
	}
}

var copyValuesInternal = function (from, to) {
	// TODO: can we improve this check to check for Mongoose model objects?
	if ('object' == typeof from && 'object' == typeof to) {
		to.name = from.name;
		to.class = from.class;
		to.css = from.css;
		to.tag = from.tag;
	} else {
		console.log("WARN: invalid arguments: must be of type \'object\'");
	}
}

exports.copyValues = copyValuesInternal;
