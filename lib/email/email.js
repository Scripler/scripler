var path = require('path')
	, mcapi = new require('mailchimp-api')
	, conf = require('config')
	, logger = require('../logger')
	, env = process.env.NODE_ENV
	, SparkPost = require('sparkpost')
	, client = new SparkPost(conf.sparkpost.apiKey);

exports.sendUserEmail = function (user, locals, templateName) {
	var substitutionData = {
		LNAME: user.lastname,
		FNAME: user.firstname,
		EMAIL: user.email
	};

	// Translate locals to SparkPost format
	if (locals && locals.length) {
		for (var i = 0; i < locals.length; i++) {
			var local = locals[i];
			substitutionData[local.name] = local.content;
		}
	}

	var reqOpts = {
		transmissionBody: {
			metadata: {
				"user_id": user._id
			},
			substitution_data: substitutionData,
			recipients: [{ address: { email: user.email, name: user.firstname + " " + user.lastname}}],
			content: {
				template_id: templateName
			},
		}
	};

	logger.info("Sending email. Details: " + JSON.stringify(reqOpts));
	if ('test' != env) {

		client.transmissions.send(reqOpts, function(err, res) {
			if (err) {
				logger.error('A SparkPost error occurred: ' + err);
			} else {
				logger.info("Successfully sent email through SparkPost: " + JSON.stringify(res.body));
			}
		});
	}
};

exports.newsletterSubscribe = function (user) {
	var mc = new mcapi.Mailchimp(conf.mailchimp.apiKey);

	if ('test' != env) {
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
	}
};

exports.newsletterUnsubscribe = function (email) {
	var mc = new mcapi.Mailchimp(conf.mailchimp.apiKey);
	if ('test' != env) {
		mc.lists.unsubscribe({
			id: conf.mailchimp.memberListId,
			email: {email: email},
			send_goodbye: false,
			send_notify: false
		}, function (data) {
			logger.info("MailChimp unsubscribe successful: " + email);
		}, function (error) {
			logger.error("MailChimp unsubscribe error: " + email + " - " + error.code + " - " + error.error);
		});
	}
};