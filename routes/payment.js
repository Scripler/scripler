var conf = require('config');
var braintree = require('braintree');
var logger = require('../lib/logger');
var User = require('../models/user.js').User;
var env = process.env.NODE_ENV;
var Styleset = require('../models/styleset.js').Styleset;
var emailer = require('../lib/email/email.js');

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


exports.transaction = function (req, res, next) {
	var user = req.user;
	var nonce = req.body.payment_method_nonce;
	var styleset = req.styleset;

	var amount;
	var productName;
	if (styleset) {
		if (styleset.isSystem) {
			return next( {message: "You can not pay for a system styleset", status: 593} )
		} else if (styleset.accessPayment){
			return next( {message: "You have already paid for this styleset.", status: 594} )
		}
		amount = "2.99";
	} else {
		// Some other kind of payment:
		// - Help with creating an ebook?
		// - Design help
		// - etc?
		amount = "10.00";
		productName = "xxx";
	}

	var addTransaction = function (next) {
		logger.info("Adding braintree transaction for user " + user.id + ".");
		gateway.transaction.sale({
			amount: amount,
			customerId: user.payment.customerId,
			paymentMethodNonce: nonce
		}, function (err, result) {
			if (err) {
				return next(err);
			}
			if (result.success) {
				var transactionId = result.transaction.id;
				user.payment.payments.push({
					id: transactionId,
					amount: amount,
					type: 'single',
					description: (styleset ? 'Payment for styleset: ' + styleset.id : 'Payment for ' + productName)
				});

				// TODO: Implement: Send invoice to user.
				emailer.sendUserEmail(
					user,
					[
						{name: "PRODUCTNAME", content: (styleset ? 'Design: ' + styleset.name : productName)},
						{name: "PRODUCTPRICE", content: amount}
					],
					'payment-invoice'
				);

				user.save(function (err) {
					if (err) {
						logger.error("Could not store transaction information for " + user.id + ", transaction " + transactionId);
						logger.error(err);
					}
					logger.debug("Stored transaction information for " + user.id + ", transaction " + transactionId);
				});
				if (styleset) {
					addStyleSetAccess(transactionId, function (err, next){
						return res.send({});
					});
				} else {
					return next();
				}
			} else {
				// Error
				return next(result);
			}
		});
	}

	var addStyleSetAccess = function (transactionId, next) {
		// If user has never been premium, he should only have the input styleset as a user styleset.
		// In this case we only need to update that single styleset with payment information.
		// Otherwise, if the user for some reason, already has this styleset as user stylesets (maybe he was premium earlier),
		// then we should also update payment information or these.

		// If input was document styleset instead of user-styleset, we need to look up the original.
		Styleset.findOne({"_id": styleset.original}).exec(function (err, stylesetOriginal) {
			if (err) {
				return next(err);
			}
			if (!stylesetOriginal.isSystem) {
				// If original styleset is system styleset, we already had the user styleset. Otherwise we had the document-styleset, and now got the user-styleset.
				styleset = stylesetOriginal;
			}
			// Update all user- and document-stylesets with transaction id.
			Styleset.update({$or: [{"original": styleset.id}, {"_id": styleset._id}]}, {accessPayment: transactionId}, {multi: true}, function (err, numberAffected, raw) {
				if (err) {
					return next(err);
				}
				logger.debug("Updated " + numberAffected + " stylesets with transaction-id. User-styleset: " + styleset.id + ", user: " + user.id);
				return next(null, numberAffected);
			});
		});
	}

	if ('test' == env) {
		// We don't want to talk to Braintree during unit-test.
		if (styleset) {
			addStyleSetAccess('test-transaction', function (err, numberAffected){
				if (err) {
					return next(err);
				}
				return res.send({numberAffected: numberAffected});
			});
		} else {
			res.send({});
		}

	} else if (user.payment.customerId) {
		addTransaction(function (err) {
			if (err) {
				return next(err);
			}
			return res.send({});
		});

	} else {
		// New customer in braintree vault (without payment method)
		var customerRequest = {
			id: user.id,
			firstName: user.firstname,
			lastName: user.lastname
		};
		gateway.customer.create(customerRequest, function (err, result) {
			if (err) {
				return next(err);
			}
			if (result.success) {
				user.payment.customerId = result.customer.id;
				addTransaction(function (err) {
					if (err) {
						return next(err);
					}
					return res.send({});
				});
			} else {
				return next(result);
			}
		});
	}
}

exports.create = function (req, res, next) {
	var user = req.user;
	var nonce = req.body.payment_method_nonce;

	var addSubscription = function (paymentMethodToken) {
		logger.info("Adding braintree subscription for user " + user.id + ". Token: " +  paymentMethodToken);
		var subscriptionRequest = {
			planId: "premium",
			paymentMethodToken: paymentMethodToken
		};

		gateway.subscription.create(subscriptionRequest, function (err, result) {
			if (err) {
				return next("Could not create Braitree subscription: " + err.name);
			}
			if (result.success) {
				logger.info(result);
				var subscriptionId = result.subscription.id;
				user.level = 'premium';
				user.payment.subscriptionId = subscriptionId;
				logger.info("Added braintree subscription for user " + user.id + ". Subscription id: " +  subscriptionId);

				// TODO: Implement: Send order confirmation to user.
				emailer.sendUserEmail(
					user,
					[
						{name: "PLAN", content: "Premium"},
						{name: "PRICE", content: "9.99/month"},
						{name: "TRIAL", content: "10 days"}
					],
					'payment-subscription-confirmation'
				);

				user.save(function (err) {
					if (err) {
						// We have a user with a running subscription not stored in our local database.
						logger.error("CRITICAL! Could not update subscription information on user " + user.id + ", for subscription id " + subscriptionId + ". Error: " + JSON.stringify(err));
						return next(err);
					};
					res.send({});
				});
			} else {
				return next(result);
			}
		});
	};

	if ('test' == env) {
		// We don't want to talk to Braintree during unit-test.
		user.level = 'premium';
		user.payment.subscriptionId = 'test-subscription';
		user.save(function (err) {
			if (err) {
				return next(err);
			};
			res.send({});
		});

	} else if (user.payment.customerId) {
		// Customer already created in braintree vault - add payment method

		var paymentMethodRequest = {
			customerId: user.payment.customerId,
			paymentMethodNonce: nonce
		};

		gateway.paymentMethod.create(paymentMethodRequest, function (err, result) {
			if (err) {
				return next("Could not create Braitree paymentMethod: " + err.name);
			}
			if (result.success) {
				logger.info("paymentMethod.create: " + JSON.stringify(result));
				// TODO If subscription already exists, update instead! Cancel the old?
				return addSubscription(result.paymentMethod.token);
			} else {
				return next(result);
			}
		});

	} else {
		// New customer in braintree vault (with payment method)
		var customerRequest = {
			id: user.id,
			firstName: user.firstname,
			lastName: user.lastname,
			paymentMethodNonce: nonce
		};
		gateway.customer.create(customerRequest, function (err, result) {
			if (err) {
				return next("Could not create Braitree customer: " + err.name);
			}
			if (result.success) {
				user.payment.customerId = result.customer.id;
				return addSubscription(result.customer.creditCards[0].token);
			} else {
				return next(result);
			}
		});
	}
};

exports.cancel = function (req, res, next) {
	var user = req.user;

	if (user.payment.subscriptionId) {
		gateway.subscription.cancel(user.payment.subscriptionId, function (err, result) {
			if (result.success) {
				console.log("Subscription cancelled:");
				console.log(result);
				res.send({});
			} else {
				return next( {message: result.message, status: 591} );
			}
		});
	} else {
		return next( {message: "No active subscription found", status: 592} )
	}
}

exports.initWebhook = function (req, res, next) {
	// First time webhook initialization.
	if (req.query.bt_challenge) {
		res.send(gateway.webhookNotification.verify(req.query.bt_challenge));
	} else {
		res.send();
	}
};

exports.webhook = function (req, res, next) {
	logger.info("Got webhook:");
	logger.info(JSON.stringify(req.body));
	gateway.webhookNotification.parse(
		req.body.bt_signature,
		req.body.bt_payload,
		function (err, webhookNotification) {
			logger.info(JSON.stringify(webhookNotification));
			logger.info("[Webhook Received " + webhookNotification.timestamp + "] | Kind: " + webhookNotification.kind + " | Subscription: " + webhookNotification.subscription.id + " | Data: " + JSON.stringify(webhookNotification));
			var subscription = webhookNotification.subject.subscription;
			var subscriptionId = subscription.id;

			var kind = webhookNotification.kind;
			var changedUser = false;

			if (subscription && subscriptionId) {
				// Load associated customer
				User.findOne({"payment.subscriptionId": subscriptionId}, function (err, user) {
					if (err) {
						logger.error("Error looking up user associated with subscription: " + subscriptionId);
						return res.sendStatus(500);
					}
					if (!user) {
						logger.info("Could not find user associated with subscription: " + subscriptionId);
						return res.sendStatus(200);
					}
					if (['subscription_expired', 'subscription_past_due', 'subscription_trial_ended'].indexOf(kind) >= 0) {
						if (subscription && subscription.status != 'active' && user.level != 'free') {
							// We got data on the subscription (degraded)
							user.level = 'free';
							changedUser = true;
							logger.info("User " + user.id + "downgraded to 'free', because of " + kind +" webhook.");
						} else {
							logger.info("Ignored " + kind + "webhook, because subscription is still active.");
						}

					} else if (kind == 'subscription_charged_successfully') {
						// TODO: Implement: Send invoice to user
						logger.info("Sending invoice to user...");
						emailer.sendUserEmail(
							user,
							[
								{name: "PRODUCTNAME", content: "Premium"},
								{name: "PRODUCTPRICE", content: "999"}
							],
							'payment-invoice'
						);

					} else if (kind == 'subscription_charged_unsuccessfully') {
						// TODO: Implement: Send warning to user. Suspend subscription?
						logger.info("Sending notification to user...");
						emailer.sendUserEmail(
							user,
							[
								{name: "PLAN", content: "Premium"}
							],
							'payment-subscription-charge-failed'
						);
					} else if (kind == 'subscription_canceled') {
						// TODO: Implement: Send subscription cancellation confirmation to user.
						emailer.sendUserEmail(
							user,
							[
								{name: "PLAN", content: "Premium"},
								{name: "BILLCYCLEEND", content: "12/12-2015"}
							],
							'payment-subscription-charge-failed'
						);
					} else {
						logger.info("Unhandled " + kind + " webhook. Nothing to do?");
					}

					if (changedUser) {
						user.save(function (err) {
							if (err) {
								logger.error("Could not update subscription information on user " + user.id + ", for subscription id " + subscriptionId);
							};
							res.sendStatus(200);
						});
					} else {
						res.sendStatus(200);
					}
				});
			} else {
				logger.info("Skipping webhook " + kind + ", since it is not related to subscription.");
				return res.sendStatus(200);
			}
		}
	);
};

