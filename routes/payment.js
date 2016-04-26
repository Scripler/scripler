var conf = require('config');
var braintree = require('braintree');
var logger = require('../lib/logger');
var User = require('../models/user.js').User;
var env = process.env.NODE_ENV;
var Styleset = require('../models/styleset.js').Styleset;
var emailer = require('../lib/email/email.js');
var utils = require('../lib/utils');
var euVatRates = require('../lib/eu-vat-rates.json');
var moment = require('moment');

var gateway = braintree.connect({
	environment: (conf.braintree.env == 'production' ? braintree.Environment.Production : braintree.Environment.Sandbox),
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
	var styleset = req.styleset;
	var amount;
	var productName;
	if (styleset) {
		if (styleset.isSystem) {
			return next( {message: "You can not pay for a system styleset", status: 593} )
		} else if (styleset.accessPayment){
			return next( {message: "You have already paid for this styleset.", status: 594} )
		}
		amount = conf.prices.styleset.price;
	} else {
		// Some other kind of payment:
		// - Help with creating an ebook?
		// - Design help
		// - etc?
		amount = "10.00";
		productName = "xxx";
		return next( {message: "Unsupported non-styleset single transaction was requested!", status: 595} )
	}

	var addTransaction = function (next) {
		logger.info("Adding braintree transaction for user " + user.id + ".");
		gateway.transaction.sale({
			amount: amount,
			customerId: user.payment.customerId,
			paymentMethodNonce: req.body.payment_method_nonce
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

				emailer.sendUserEmail(
					user,
					[
						{name: "PRODUCTNAME", content: (styleset ? conf.prices.styleset.name + ': ' + styleset.name : productName)},
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
						return next();
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
		// If user has never been premium, he should only have the input styleset as a user styleset (and not any copies).
		// In this case we only need to update that single styleset instance with payment information.
		// Otherwise, if the user for some reason, already has copies of this styleset as document styleset in multiple documents (maybe he was premium earlier),
		// then we should also update payment information for these.

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
				// We return some additional information when running in test, so that the unit-test can verify what has been done.
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
				logger.debug("Successfully created Braintree customer for user " + user.id + ".");
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

exports.create_subscription = function (req, res, next) {
	var user = req.user;
	var nonce = req.body.payment_method_nonce;
	var billingCountryCode = req.body.billingCountryCode;

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
				user.payment.billingCountryCode = billingCountryCode;
				logger.info("Added braintree subscription for user " + user.id + ". Subscription id: " +  subscriptionId);

				var plan = conf.plans[user.level];
				if (!plan) {
					logger.error("Plan '"+plan+"' is not configured.");
					return next("Internal error");
				}
				emailer.sendUserEmail(
					user,
					[
						{name: "PLAN", content: plan.name},
						{name: "PRICE", content: plan.price + "/month"},
						{name: "TRIAL", content: plan.trial + " days"}
					],
					'payment-subscription-confirmation'
				);

				user.save(function (err) {
					if (err) {
						// We have a user with a running subscription not stored in our local database.
						logger.error("CRITICAL! Could not update subscription information on user " + user.id + ", for subscription id " + subscriptionId + ". Error: " + JSON.stringify(err));
						return next(err);
					};
					res.send({user: utils.cleanUserObject(user)});
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
				return next("Could not create Braintree customer: " + err.name);
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

exports.cancel_subscription = function (req, res, next) {
	var user = req.user;

	if (user.payment.subscriptionId) {
		gateway.subscription.cancel(user.payment.subscriptionId, function (err, result) {
			if (result.success) {
				// All good. We will notify the customer by email when we get the cancellation confirmation from Braintree through webhook.
				user.payment.cancelled = true;
				user.save(function (err) {
					if (err) {
						return next(err);
					} else {
						res.send({user: utils.cleanUserObject(user)});
					}
				})
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

	var handleWebhook = function (webhookNotification) {
		logger.info("[Webhook Received] | Data: " + JSON.stringify(webhookNotification));

		var subscription = webhookNotification.subscription;
		var subscriptionId = subscription ? subscription.id : null;

		var kind = webhookNotification.kind;

		if (subscription && subscriptionId) {
			// Load associated customer
			User.findOne({"payment.subscriptionId": subscriptionId}, function (err, user) {
				var changedUser = false;
				var callbackHandlesReturn = false;
				if (err) {
					logger.error("Error looking up user associated with subscription: " + subscriptionId);
					return res.sendStatus(500);
				}
				if (!user) {
					logger.info("Could not find user associated with subscription: " + subscriptionId);
					return res.sendStatus(200);
				}

				var planName;
				if (conf.plans[subscription.planId]) {
					planName = conf.plans[subscription.planId].name;
				} else {
					logger.error("We charged for an 'unknown' planId: " + subscription.planId);
					planName = subscription.planId;
				}

				if (['subscription_expired', 'subscription_past_due'].indexOf(kind) >= 0) {
					// subscription_expired - Subscription had an end date set, which has now been reached
					// subscription_past_due - Subscription bill cycle is past due (we should already have gotten a subscription_charged_unsuccessfully)
					user.level = 'free';
					changedUser = true;
					logger.info("User '" + user.id + "' downgraded to 'free', because of '" + kind + "' webhook.");

				} else if (['subscription_trial_ended'].indexOf(kind) >= 0) {
					// subscription_trial_ended - The trial days has ended, and now the first billed cycle will start (unless already cancelled)
					if (subscription && subscription.status != 'active' && user.level != 'free') {
						// We got data on the subscription (degraded)
						user.level = 'free';
						changedUser = true;
						logger.info("User '" + user.id + "' downgraded to 'free', because of '" + kind +"' webhook.");
					} else {
						logger.info("Ignored " + kind + "webhook, because subscription is still active.");
					}

				} else if (kind == 'subscription_went_active') {
					// subscription_went_active - Subscription has been reactivated for some reason (administrator intervention?)
					user.level = subscription.planId
					changedUser = true;
					logger.info("User '" + user.id + "' upgraded to '"+subscription.planId+"', because of '" + kind +"' webhook.");

				} else if (kind == 'subscription_charged_successfully') {
					logger.info("Sending invoice to user...");

					// Find credit card used for transaction
					var transaction = subscription.transactions[0];
					var creditCardText = transaction.creditCard.cardType + ' ' + transaction.creditCard.maskedNumber;

					// Calculate pricing
					var countryCode = user.payment.billingCountryCode;
					var country;
					var vatRate;
					if (euVatRates[countryCode]) {
						vatRate = euVatRates[countryCode].rate;
						country = euVatRates[countryCode].name;
					} else {
						vatRate = euVatRates['?'].rate;
						country = euVatRates['?'].name;
					}
					var priceExVat = Math.round((subscription.price / (1 + vatRate)) * 100) / 100;

					// Format subscription period: 15 January 2015 - 15 February 2015
					var dateStart = moment(subscription.billingPeriodStartDate).format('MMMM D YYYY');
					var dateEnd = moment(subscription.billingPeriodEndDate).format('MMMM D YYYY');
					var subscriptionPeriod = dateStart + ' - ' + dateEnd;

					callbackHandlesReturn = true;
					utils.getNextId('invoiceNo', function (err, invoiceNo) {
						if (err) {
							logger.error("Error getting invoice number: " + err);
							return res.sendStatus(500);
						}

						// Send invoice email
						emailer.sendUserEmail(
							user,
							[
								{name: "INVOICENO", content: invoiceNo },
								{name: "PRODUCTNAME", content: planName},
								{name: "SUBSCRIPTIONPERIOD", content: subscriptionPeriod},
								{name: "PRODUCTPRICE", content: subscription.price},
								{name: "PRODUCTPRICEEXVAT", content: priceExVat },
								{name: "VATRATE", content:  vatRate*100 },
								{name: "CREDITCARD", content: creditCardText },
								{name: "COUNTRY", content: country},
								{name: "DATE", content: moment().format('MMMM Do, YYYY')}
							],
							'payment-invoice'
						);

						// Store transaction in user
						user.payment.payments.push({
							id: 'S'+invoiceNo,
							amount: subscription.price,
							type: 'recurring',
							countryCode: countryCode,
							vatRate: vatRate,
							description: 'Payment for Premium subscription: ' + subscription.id
						});
						// Don't use changedUser boolean, since we are inside a callback here
						user.save(function (err, user) {
							if (err) {
								logger.error("Could not update subscription information on user " + user.id + ", for subscription id " + subscriptionId);
							};
							return res.sendStatus(200);
						});
					})

				} else if (kind == 'subscription_charged_unsuccessfully') {
					logger.info("Sending notification to user...");
					emailer.sendUserEmail(
						user,
						[
							{name: "PLAN", content: planName},
							{name: "PRICE", content: subscription.price}
						],
						'payment-subscription-charge-failed'
					);


				} else if (kind == 'subscription_canceled') {
					var endDate;
					if (subscription.trialPeriod) {
						// We need to substract one, becayse the last day of the trial is the day before the next billing date.
						// Format : YYYY-MM-DD
						endDate = utils.addDaysToDate(subscription.nextBillingDate, -1);
					} else {
						endDate = subscription.paidThroughDate;
					}
					user.payment.endDate = new Date(endDate);
					changedUser = true;

					emailer.sendUserEmail(
						user,
						[
							{name: "PLAN", content: planName},
							{name: "BILLCYCLEEND", content: endDate}
						],
						'payment-subscription-cancelled'
					);
				} else {
					logger.info("Unhandled " + kind + " webhook. Nothing to do?");
				}

				if (changedUser && !callbackHandlesReturn) {
					user.save(function (err, user) {
						if (err) {
							logger.error("Could not update subscription information on user " + user.id + ", for subscription id " + subscriptionId);
						};
						res.sendStatus(200);
					});
				} else if (!callbackHandlesReturn) {
					res.sendStatus(200);
				}
			});
		} else {
			logger.info("Skipping webhook " + kind + ", since it is not related to subscription.");
			return res.sendStatus(200);
		}
	}

	if (req.body.bt_signature && req.body.bt_payload) {
		// We got real encrypted payload from Braintree
		gateway.webhookNotification.parse(
			req.body.bt_signature,
			req.body.bt_payload,
			function (err, webhookNotification) {
				if (err) {
					return next(err);
				}
				return handleWebhook(webhookNotification);
			}
		);
	} else if (req.body.kind) {
		// We got plain text payload - from test.
		return handleWebhook(req.body);
	} else {
		return next("Unknown webhook payload: " + JSON.stringify(req.body));
	}
};

