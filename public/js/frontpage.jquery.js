$(document).ready(function() {

	var documentHeight = $(window).height();
	if (documentHeight < 680) {
		documentHeight = 720;
	}

	function windowSize() {
		$('#scripler, #features, #about, #contact, #map-canvas').height(documentHeight).css("overflow", "hidden");
	}

	windowSize();
	window.onresize = function (event) {
		windowSize();
	}

	function isScrolledIntoView(elem) {
		var docViewTop = $(window).scrollTop();
		var docViewBottom = docViewTop + $(window).height();

		var elemTop = $(elem).offset().top;
		var elemBottom = elemTop + $(elem).height();

		return ( (elemBottom >= docViewTop) && (elemTop <= docViewBottom)
			&& (elemBottom <= docViewBottom) && (elemTop >= docViewTop) );
	}

	$(".menu-top li.navpoint").on("click", function (event) {
		if ($(this).attr("data") == "blog") {
			//do nothing
		} else {
			event.preventDefault();
			if ($(this).attr("data") == "create") {
				document.location.href = "/create";
				return;
			}
			if ($(this).attr("data") == "explore") {
				document.location.href = "/explore";
				return;
			}

			var gotoPoint = "#" + $(this).attr("data");

			if (!isScrolledIntoView($(gotoPoint))) {
				$('html, body').stop(true, true).animate({scrollTop: $(gotoPoint).offset().top}, 800);
			}
		}
	});

	$("#login-form").submit(function (event) {
		event.preventDefault();
		hideInvalidBoxes();

		var formOk = true;
		var password = $("#login-password").val();
		var email = $("#login-email").val();

		if (forgotPassword) {
			if (!utils.isValidEmail(email)) {
				invalidBox1(240, "Invalid email address");
				formOk = false;
			}
			if (formOk) {
				$.ajax({
					url: '/user/password-reset',
					type: 'POST',
					data: {"email": $("#login-email").val()},
					dataType: 'json',
					success: function (data) {
						formSuccess("If you entered your correct email address, an email has been sent to you. By using the link in this email you can change your password.");
					},
					error: function (xhr, textStatus, error) {
						invalidBox1(450, "Error");
					}
				});
			}
		} else {
			if (!utils.isValidEmail(email)) {
				invalidBox1(0, "Invalid email address");
				formOk = false;
			}
			if (!isValidPassword(password)) {
				invalidBox2(259, "Six characters minimum");
				formOk = false;
			}

			if (formOk) {
				console.log("Second login request...");
				$.ajax({
					url: '/user/login',
					type: 'POST',
					data: {"email": email, "password": password, "remember": $("#remember").val()},
					dataType: 'json',
					success: function (data) {
						document.location.href = "/create/";
					},
					error: function (xhr, textStatus, error) {
						console.log("Login failed: " + error);
						invalidBox1(455, "Login failed");
					}
				});
			}
		}
	});

	var forgotPassword = false;
	var passwordWidth = $("#login-password").outerWidth(true);
	$("#forgot-password").on("click", function (event) {
		hideInvalidBoxes();
		var animationTime = 400;
		var emailExtraWidth = 50;
		if (!forgotPassword) {
			var newMargin = passwordWidth - emailExtraWidth;
			$("#login-password").animate({ "width": 0, "padding": 0, "margin": 0 }, animationTime);
			$("#login-email").animate({ "width": "+=" + emailExtraWidth }, animationTime);
			$("#login-form").animate({ "marginLeft": newMargin}, animationTime);
			$("#remember-me-box").fadeOut(animationTime);
			setTimeout(function () {
				$("#login-button").prop("value", "Reset password");
				$("#login-button").css("fontSize", "80%");
				$("#forgot-password").text("Cancel");
			}, animationTime);
		} else {
			resetLoginForm();
		}
		forgotPassword = !forgotPassword;
	});

	function resetLoginForm() {
		$("#login-password").removeAttr("style");
		$("#login-email").removeAttr("style");
		$("#login-form").removeAttr("style");
		$("#remember-me-box").removeAttr("style");
		$("#login-button").removeAttr("style");
		$("#login-button").prop("value", "Login");
		$("#forgot-password").text("Forgot password?");
		forgotPassword = false;
	}

	$(".menu-login").on("click", function (event) {
		// Ensure that it's the normal login form that is shown.
		hideInvalidBoxes();
		$("#login-form").css("display", "block");
		$("#password-reset-form").css("display", "none");
		$("#form-success").css("display", "none");
		resetLoginForm();
	});

	// Handle the password reset entry page
	if (location.hash && location.hash.indexOf("#password-reset") === 0) {
		var args = location.hash.substring(1).split('/');
		var userId = args[1];
		var token = args[2];

		// Switch login-article from login-form to password-reset-form, and display immediately
		$("#login").css("paddingBottom", 20);
		$("#login").css("paddingTop", 70);
		$("#login-form").css("display", "none");
		$("#password-reset-form").css("display", "block");

		$("#password-reset-button").on("click", function (event) {
			event.preventDefault();
			hideInvalidBoxes();
			var password = $("#password1").val();
			if (password == $("#password2").val()) {
				if (isValidPassword(password)) {
					$.ajax({
						url: '/user/'+userId+'/password-change',
						type: 'POST',
						data: {"password": password, "token": token},
						dataType: 'json',
						success: function (data) {
							formSuccess("Your password has been changed.");
						},
						error: function (xhr, textStatus, error) {
							console.log("Failed password change: " + error);
							invalidBox1(480, "Error");
						}
					});
				} else {
					invalidBox1(0, "Six characters minimum");
				}
			} else {
				invalidBox1(259, "Passwords do not match");
			}
		});
	}

	// Check if user is already logged in
	$.ajax({
		url: '/user',
		type: 'GET',
		data: {},
		dataType: 'json',
		success: function (data) {
			if (data && data.user) {
				var user = data.user;
				// Non-demo user is already logged in.
				// It must be possible for existing users who have not logged in, clicked "Go" and then gone back to the frontpage, to log in
				// but we do not want to show "calculated" demo user names ("Scripler Demo <timestamp>").
				if (!user.isDemo && user.firstname) {
					$(".menu-loggedin").css("display", "inline");
					$(".menu-loggedin").attr("title", "You are logged in as " + data.user.firstname);
					$(".menu-login").css("display", "none");
				} else if (user.isDemo) {
					$("#login").animate({ "paddingBottom": "20", "paddingTop": "70" }, 800);
					$(".menu-login").css("display", "inline");
				}
			}
		},
		error: function (request, status, error) {
			$("#login").animate({ "paddingBottom": "20", "paddingTop": "70" }, 800);
		}
	});

	function formSuccess(message) {
		var p = $("#form-success");
		p.text(message);
		p.css("display", "block");
		$("#login-form").css("display", "none");
		$("#password-reset-form").css("display", "none");
	}

	function invalidBox1(left, message) {
		var box = $("#invalid-box1");
		box.css("display", "block");
		box.css("margin-left", left + "px");
		box.text(message);
	}

	function invalidBox2(left, message) {
		var box = $("#invalid-box2");
		box.css("display", "block");
		box.css("margin-left", left + "px");
		box.text(message);
	}

	function hideInvalidBoxes() {
		$("#invalid-box1").css("display", "none");
		$("#invalid-box2").css("display", "none");
	}

	$( ".menu-login" ).on("click", function( event ) {
		$(":animated").promise().done( function() {
			$( "#login-email" ).focus();
		});
	});

	$(".to-top").on("click", function(event){
		event.preventDefault();
		var gotoPoint = "#scripler";

		$('html, body').animate({scrollTop: $(gotoPoint).offset().top}, 800);
	});

	function isValidPassword(password) {
		return password !== 'undefined' && password.length >= 6;
	}

	function GetURLParameter(sParam) {
		//var sPageURL = window.location.search.substring(1);
		var sPageURL = window.location.hash;
		var sURLVariables = sPageURL.split('?');

		for (var i = 0; i < sURLVariables.length; i++) {
			var sParameterName = sURLVariables[i].split('=');

			if (sParameterName[0] == sParam) {
				return sParameterName[1];
			}
		}
	}

	var CenterLatlng = new google.maps.LatLng(55.66545,12.599407);
	var ScriplerLatlng = new google.maps.LatLng(55.669104,12.611121);
	var mapOptions = {
		center: CenterLatlng,
		zoom: 15,
		minZoom: 10,
		maxZoom: 16,
		disableDefaultUI: true,
		scrollwheel: false,
		navigationControl: false,
		mapTypeControl: false,
		scaleControl: false,
		draggable: false,
		mapTypeId: google.maps.MapTypeId.HYBRID
	};
	var map = new google.maps.Map(document.getElementById("map-canvas"),
		mapOptions);

	var marker = new google.maps.Marker({
		position: ScriplerLatlng,
		map: map,
		title: 'Scripler'
	});
});

/* Create HTML5 elements for IE */
document.createElement("nav");
document.createElement("article");
document.createElement("section");
