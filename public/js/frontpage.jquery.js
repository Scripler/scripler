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

		$('html, body').animate({scrollTop: $(gotoPoint).offset().top}, 1000);
		/*bodyElement.animate({
			scrollTop: $(gotoPoint).offset().top
		}, {
			duration: 2000,
			step: function( now, fx ){
        		documentScrollColor();
			}
		});*/
	});

    $(".to-top").on("click", function(event){
    	event.preventDefault();
    	var gotoPoint = "#scripler";

    	$('html, body').animate({scrollTop: $(gotoPoint).offset().top}, 1000);
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

    console.log($("#news"));
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
        $('html, body').animate({scrollTop: $(gotoPoint).offset().top}, 1000, function() {
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