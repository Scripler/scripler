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

        return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom));
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

        var offset = $(gotoPoint).offset().top;

        if ( $(this).attr("data") == "login") {
            offset = 0;
        }

        if ( $(this).attr("data") == "scripler") {
            offset = 80;
        }

        if ( !isScrolledIntoView($(gotoPoint)) ) {
            $('html, body').animate({scrollTop: offset}, 800);
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
        $( "#login" ).animate({ "marginTop": "20" }, 800);	
        $( "#scripler" ).animate({ "paddingTop": 100 }, 800);
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

    $("#about").on('click', '.seeteam, .prev', function(e) {
    	e.preventDefault();

		var target = $(this).attr("class");
        if (target == 'seeteam') {
        	$("#about article").animate({
            	left: '-=100%'
        	}, 'slow');
        	$('#about .prev').fadeIn('slow');
        }
        else {
        	$("#about article").animate({
            	left: '+=100%'
        	}, 'slow');
        	$('#about .prev').fadeOut('slow');
        }
    });

    $("#news").on('click', '.readmore, .prev', function(e) {
    	e.preventDefault();

        var gotoPoint = "#news";
		var target = $(this).attr("class");

        if (target == 'readmore') {

            var moveBackNumber = $(this).data('move');
            var gotoLeftPoint = 100*moveBackNumber;

            $('body').animate({scrollTop: $(gotoPoint).offset().top}, 'fast', function() {
                $("#news article").animate({
                    left: '-=' + gotoLeftPoint + '%'
                }, 'slow');
                $('#news .prev').data('prev', moveBackNumber);
                $('#news .prev').fadeIn('slow');
            });
        }
        else {

            var gotoRightPoint = 100*$('#news .prev').data('prev');

            $("#news article").animate({
                left: '+=' + gotoRightPoint + '%'
            }, 'slow', function() {
                $('body').animate({scrollTop: $(gotoPoint).offset().top}, 'fast');
            });
            $('#news .prev').fadeOut('slow');
        }
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

    var newsItem = GetURLParameter('news');
    if (newsItem >= 1) {
        var gotoPoint = "#news";
        var gotoLeftPoint = 100*newsItem;
        $('html, body').animate({scrollTop: $(gotoPoint).offset().top}, 800, function() {
            $("#news article").animate({
                left: '-' + gotoLeftPoint + '%'
            }, 'slow');
            $('#news .prev').data('prev', newsItem);
            $('#news .prev').fadeIn('slow');
        });

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
