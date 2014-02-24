$(document).ready(function(){

	var documentHeight = $(window).height();
	if (documentHeight < 680) {
		documentHeight = 720;
	}

	function windowSize() {
		$('#scripler, #features, #about, #contact, #contact, #map-canvas').height(documentHeight).css( "overflow", "hidden" );
	}

	windowSize();
	window.onresize = function(event) {
		windowSize();
	}

	function isScrolledIntoView(elem) {
		var docViewTop = $(window).scrollTop();
		var docViewBottom = docViewTop + $(window).height();

		var elemTop = $(elem).offset().top;
		var elemBottom = elemTop + $(elem).height();

		return ( (elemBottom >= docViewTop) && (elemTop <= docViewBottom)
			&& (elemBottom <= docViewBottom) &&  (elemTop >= docViewTop) );
	}

	$(".menu-top li.navpoint").on("click", function(event){
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

		if ( !isScrolledIntoView($(gotoPoint)) ) {
			$('html, body').stop(true,true).animate({scrollTop: $(gotoPoint).offset().top}, 800);
		}

		/*bodyElement.animate({
			scrollTop: $(gotoPoint).offset().top
		}, {
			duration: 2000,
			step: function( now, fx ){
				documentScrollColor();
			}
		});*/
	});

	$( "#login-form" ).submit(function( event ) {
		event.preventDefault();
		$.ajax({
			url: '/user/login',
			type: 'POST',
			data: "email=" + $("#login-email").val() + "&password=" + $("#login-password").val(),
			dataType: 'json',
			success: function( data ) {
				document.location.href = "/create";
			}
		});
	});

	$( ".menu-login" ).one("click", function( event ) {
		$( "#login" ).animate({ "paddingBottom": "20", "paddingTop": "70" }, 800);
	})

	$( ".menu-login" ).on("click", function( event ) {
		$(":animated").promise().done( function() {
			$( "#login-email" ).focus();
		});
	})

	$(".to-top").on("click", function(event){
		event.preventDefault();
		var gotoPoint = "#scripler";

		$('html, body').animate({scrollTop: $(gotoPoint).offset().top}, 800);
	});

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

	var CenterLatlng = new google.maps.LatLng(55.6654175,12.5815801);
	var ScriplerLatlng = new google.maps.LatLng(55.669104,12.611121);
	var mapOptions = {
		center: CenterLatlng,
		zoom: 14,
		minZoom: 10,
		maxZoom: 16,
		disableDefaultUI: true,
		scrollwheel: false,
		navigationControl: false,
		mapTypeControl: false,
		scaleControl: false,
		draggable: false,
		mapTypeId: google.maps.MapTypeId.ROADMAP
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
