var path = require('path')
	, templatesDir = path.resolve(__dirname, '.', 'templates')
	, emailTemplates = require('email-templates')
	, conf = require('config')
	, logger = require('../logger')
	, nodemailer = require('nodemailer');

exports.sendEmail = function (locals, subject, templateName) {

	emailTemplates(templatesDir, function (err, template) {

		if (err) {
			console.log(err);
		} else {

			// ## Send a single email
			// Prepare nodemailer transport object
			var transport = nodemailer.createTransport(conf.smtp);

			// Send a single email
			template(templateName, locals, function (err, html, text) {
				if (err) {
					console.log(err);
				} else {
					transport.sendMail({
						from: 'Scripler <scripler@scripler.com>',
						to: locals.email,
						subject: 'Scripler - ' + subject,
						html: html,
						text: text
					}, function (err, info) {
						if (err) {
							logger.error(err);
						} else if (info.response) {
							logger.info("Email sent: " + info.response);
						}
					});
				}
			});
		}
	});
};