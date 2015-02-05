var conf = require('config');
var braintree = require('braintree');

var gateway = braintree.connect({
	environment: braintree.Environment.Sandbox,
	merchantId: conf.braintree.merchantId,
	publicKey: conf.braintree.publicKey,
	privateKey: conf.braintree.privateKey
});


exports.token = function (req, res, next) {
	var user = req.user;

	// TODO: Look up if old customer!

	gateway.clientToken.generate({
		//customerId: user.id
	}, function (err, response) {
		if (err) {
			return next(err);
		}
		if (response.success) {
			res.send({token: response.clientToken});
		} else {
			// Handle error response
			return next(response);
		}
	});
}

exports.create = function (req, res, next) {
	var nonce = req.body.payment_method_nonce;

	var customerRequest = {
		firstName: req.body.first_name,
		lastName: req.body.last_name,
		paymentMethodNonce: req.body.payment_method_nonce
	};

	// TODO: Look up, instead of create, if old customer!
	gateway.customer.create(customerRequest, function (err, result) {
		if (result.success) {
			var customerId = result.customer.id;
			var cardToken = customer.creditCards[0].token;

			var subscriptionRequest = {
				paymentMethodToken: cardToken,
				planId: "test_plan_1"
			};

			gateway.subscription.create(subscriptionRequest, function (err, result) {
				res.send("Subscription Status " + result.subscription.status);
			});


		} else {
			res.send("Error: " + result.message);
		}
	});

	res.send({});

}
