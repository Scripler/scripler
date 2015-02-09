var conf = require('config');
var braintree = require('braintree');
var logger = require('../lib/logger');

var gateway = braintree.connect({
	environment: braintree.Environment.Sandbox,
	merchantId: conf.braintree.merchantId,
	publicKey: conf.braintree.publicKey,
	privateKey: conf.braintree.privateKey
});


exports.token = function (req, res, next) {
	var user = req.user;

	gateway.clientToken.generate({
		customerId: user.payment.customerId
	}, function (err, response) {
		if (err) {
			return next(err);
		}
		if (response.success) {
			res.send({token: response.clientToken});
		} else {
			return next(response);
		}
	});
};

exports.create = function (req, res, next) {
	var user = req.user;
	var nonce = req.body.payment_method_nonce;

	var addSubscription = function (customerId, paymentMethodToken) {
		logger.info("Adding braintree subscription for customer " + customerId + ". Token: " +  paymentMethodToken);
		var subscriptionRequest = {
			paymentMethodToken: paymentMethodToken,
			planId: "premium"
		};

		gateway.subscription.create(subscriptionRequest, function (err, result) {
			if (err) {
				return next(err);
			}

			if (result.success) {
				logger.info(result);
				var subscriptionId = result.subscription.id;

				user.payment.subscriptionId = subscriptionId;

				logger.info("Added braintree subscription for user " + user.id + ". Subscription id: " +  subscriptionId);

				// Save on user, but don't let the user wait for this, since we won't cancel it anyway if it fails.
				user.save(function (err) {
					if (err) {
						logger.error("Could not update subscription information on user " + user.id + ", for subscpition id " + subscriptionId);
					};
				});

				return res.send("Customer "+customerId + ", Subscription " + subscriptionId + ", Status " + result.subscription.status);
			} else {
				return next(result);
			}

		});
	};

	var nounce = req.body.payment_method_nonce;

	if (user.payment.customerId) {
		// Customer already created in braintree

		var paymentMethodRequest = {
			customerId: user.payment.customerId,
			paymentMethodNonce: nounce,
			options: {failOnDuplicatePaymentMethod: true}
		};

		// TODO handle duplicate payment method?
		gateway.paymentMethod.create(paymentMethodRequest, function (err, result) {
			if (err) {
				return next(err);
			}
			if (result.success) {
				logger.info("paymentMethod.create: " + JSON.stringify(result));
				// TODO If subscription already exists, update instead!
				return addSubscription(user.payment.customerId, result.paymentMethod.token);
			} else {
				return next(result);
			}
		});

	} else {
		// New customer in braintree

		var customerRequest = {
			firstName: user.firstname,
			lastName: user.lastname,
			paymentMethodNonce: nounce
		};
		gateway.customer.create(customerRequest, function (err, result) {
			if (err) {
				return next(err);
			}
			if (result.success) {

				user.payment.customerId = result.customer.id;

				logger.info(nounce + " vs. " + result.customer.creditCards[0].token);

				return addSubscription(result.customer.id, result.customer.creditCards[0].token);

			} else {
				return next(result);
			}
		});
	}

};

exports.initWebhook = function (req, res, next) {
	// First time webhook initialization.
	res.send(gateway.webhookNotification.verify(req.query.bt_challenge));
};

exports.webhook = function (req, res, next) {
	gateway.webhookNotification.parse(
		req.body.bt_signature,
		req.body.bt_payload,
		function (err, webhookNotification) {
			logger.info("[Webhook Received " + webhookNotification.timestamp + "] | Kind: " + webhookNotification.kind + " | Subscription: " + webhookNotification.subscription.id);
		}
	);
	res.sendStatus(200);
};

