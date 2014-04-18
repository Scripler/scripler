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
	stylesetId: { type: Schema.Types.ObjectId, ref: 'Styleset', required: true },
	members: [StyleMemberSchema],
	archived: { type: Boolean, default: false },
	deleted: { type: Boolean, default: false },
	isSystem: { type: Boolean, default: false },
	original: { type: Schema.Types.ObjectId, ref: 'Style' }
});

var InternalStyle = mongoose.model('Style', StyleSchema);
exports.Style = InternalStyle;

exports.copy = function (style, newStylesetId, next) {
	if (style) {
		var result = new InternalStyle({
			name: style.name + ' - Copy',
			class: style.class,
			css: style.css,
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
			return next(null, result);
		});
	} else {
		return next(null, null);
	}
}
