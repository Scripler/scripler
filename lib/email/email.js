var path = require('path')
	, templatesDir = path.resolve(__dirname, '.', 'templates')
	, emailTemplates = require('email-templates')
	, conf = require('config')
	, logger = require('../logger')
	, nodemailer = require('nodemailer')
	, mandrill = require('mandrill-api');

exports.sendUserEmail = function (user, locals, templateName) {

	var md = new mandrill.Mandrill(conf.mandrill.apiKey);

	var message = {
		//"subject": subject,
		"to": [
			{
				"email": user.email,
				"name": user.firstname + " " + user.lastname
			}
		],
		"global_merge_vars": [
			{name: "LNAME", content: user.lastname},
			{name: "FNAME", content: user.firstname},
			{name: "EMAIL", content: user.email}
		].concat(locals),
		"tags": [
			templateName
		],
		"metadata": {
			"user_id": user._id
		}
	};
	md.messages.sendTemplate({
		"template_name": templateName,
		"template_content": [],
		"message": message,
		"async": true
	}, function (result) {
		logger.info("Successfull sent email through Mandrill: " + JSON.stringify(result));

	}, function (e) {
		// Mandrill returns the error as an object with name and message keys
		logger.error('A mandrill error occurred: ' + e.name + ' - ' + e.message);
		// A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
	});

};

exports.newsletterSubscribe = function (user) {

	var mc = new mcapi.Mailchimp(conf.mailchimp.apiKey);

	mc.lists.subscribe({
		id: conf.mailchimp.memberListId,
		double_optin: false,
		update_existing: true,
		email: {email: user.email},
		merge_vars: {
			groupings: [
				{id: conf.mailchimp.memberGroupId, groups: [conf.mailchimp.memberGroupIdFree]}
			],
			FNAME: user.firstname,
			LNAME: user.lastname
		}
	}, function (data) {
		logger.info("MailChimp subscribe successful: " + user.email);
	}, function (error) {
		logger.error("MailChimp subscribe error: " + user.email + " - " + error.code + " - " + error.error);
	});
};
