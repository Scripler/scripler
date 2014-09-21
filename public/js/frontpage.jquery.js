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

			/*bodyElement.animate({
			 scrollTop: $(gotoPoint).offset().top
			 }, {
			 duration: 2000,
			 step: function( now, fx ){
			 documentScrollColor();
			 }
			 });*/
		}
	});

	$("#login-form").submit(function (event) {
		event.preventDefault();
		var password = $("#login-password").val();
		if (forgotPassword) {
			$.ajax({
				url: '/user/password-reset',
				type: 'POST',
				data: {"email": $("#login-email").val()},
				dataType: 'json',
				success: function (data) {
					// TODO: How to notify user of success?
					document.location.href = "/";
				},
				error: function (xhr, textStatus, error) {
					// TODO: Password reset failed
					console.log("Password reset failed: ". error);
				}
			});
		} else {
			if (isValidPassword(password)) {
				console.log("Secind login request...");
				$.ajax({
					url: '/user/login',
					type: 'POST',
					data: {"email": $("#login-email").val(), "password": password},
					dataType: 'json',
					success: function (data) {
						document.location.href = "/create/";
					},
					error: function (xhr, textStatus, error) {
						// TODO: Login failed
						console.log("Login failed: ". error);
					}
				});
			} else {
				// TODO: Invalid password
				console.log("Invalid password");
			}
		}
	});

	var forgotPassword = false;
	var passwordWidth = $("#login-password").outerWidth(true);
	$("#forgot-password").on("click", function (event) {
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
			$("#login-password").removeAttr("style");
			$("#login-email").removeAttr("style");
			$("#login-form").removeAttr("style");
			$("#remember-me-box").removeAttr("style");
			$("#login-button").removeAttr("style");
			$("#login-button").prop("value", "Login");
			$("#forgot-password").text("Forgot pssword?");
		}
		forgotPassword = !forgotPassword;
	});

	$(".menu-login").one("click", function (event) {
		$("#login").animate({ "paddingBottom": "20", "paddingTop": "70" }, 800);

		// Ensure that it's the login and noy password-reset form that is shown.
		$("#login-form").css("display", "block");
		$("#password-reset-form").css("display", "none");
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
			var password = $("#password1").val();
			if (password == $("#password2").val())
				if (isValidPassword(password)) {
					$.ajax({
						url: '/user/'+userId+'/password-change',
						type: 'POST',
						data: {"password": password, "token": token},
						dataType: 'json',
						success: function (data) {
							location.hash = "";
							location.reload();
						},
						error: function (xhr, textStatus, error) {
							// TODO: Failed password change
							console.log("Failed password change: ". error);
						}
					});
				} else {
					// TODO: Invalid password
					console.log("Invalid password");
			} else {
				// TODO: Password mismatch
				console.log("Password mismatch");
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
			if (data && data.user && data.user.firstname) {
				// User is already logged in.
				$("#welcome-user-name").text(data.user.firstname);
				$("#welcome-user").css("display", "block");
				console.log("hello!");
			}
		}
	});


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
		return password !== 'undefined' && password.length > 4;
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
/*
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
	});*/
});

/* Create HTML5 elements for IE */
document.createElement("nav");
document.createElement("article");
document.createElement("section");
