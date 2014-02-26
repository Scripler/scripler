var Style = require('../models/styleset.js').Style;
//var Styleset = require('../models/styleset.js').Styleset;

exports.create = function (req, res, next) {
	var styleset = req.styleset;

	var style = new Style({
		name: req.body.name,
		class: req.body.class,
		css: req.body.css,
		stylesetId: styleset._id
	});

	style.save(function(err) {
		if (err) {
			return next(err);
		}

		styleset.styles.push(style);
		styleset.save(function (err, styleset) {
			if (err) {
				return next(err);
			}
			res.send({style: style});
		});
	});

}