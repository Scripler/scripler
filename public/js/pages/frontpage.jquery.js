$(document).ready(function(){

	//Scroll points
	jQuery('#create').scrollPoint();
	jQuery('#features').scrollPoint();
	jQuery('#news').scrollPoint();
	jQuery('#pricing').scrollPoint();
	jQuery('#learn').scrollPoint();
	jQuery('#about').scrollPoint();
	jQuery('#contact').scrollPoint();

	jQuery(document).on("scrollPointEnter", "#create", function(event) {
		$('.menu-create').addClass('active');
	});
	jQuery(document).on("scrollPointLeave", "#create", function(event) {
	    $('.menu-create').removeClass('active');
	});
	jQuery(document).on("scrollPointEnter", "#features", function(event) {
		$('.menu-features').addClass('active');
	});
	jQuery(document).on("scrollPointLeave", "#features", function(event) {
	    $('.menu-features').removeClass('active');
	});
	jQuery(document).on("scrollPointEnter", "#news", function(event) {
		$('.menu-news').addClass('active');
	});
	jQuery(document).on("scrollPointLeave", "#news", function(event) {
	    $('.menu-news').removeClass('active');
	});
	jQuery(document).on("scrollPointEnter", "#pricing", function(event) {
		$('.menu-pricing').addClass('active');
	});
	jQuery(document).on("scrollPointLeave", "#pricing", function(event) {
	    $('.menu-pricing').removeClass('active');
	});
	jQuery(document).on("scrollPointEnter", "#learn", function(event) {
		$('.menu-learn').addClass('active');
	});
	jQuery(document).on("scrollPointLeave", "#learn", function(event) {
	    $('.menu-learn').removeClass('active');
	});
	jQuery(document).on("scrollPointEnter", "#about", function(event) {
		$('.menu-about').addClass('active');
	});
	jQuery(document).on("scrollPointLeave", "#about", function(event) {
	    $('.menu-about').removeClass('active');
	});
	jQuery(document).on("scrollPointEnter", "#contact", function(event) {
		$('.menu-contact').addClass('active');
	});
	jQuery(document).on("scrollPointLeave", "#contact", function(event) {
	    $('.menu-contact').removeClass('active');
	});

	// Cache the Window object
	$window = $(window);
                
   $('section[data-type="background"]').each(function(){
    	var $bgobj = $(this); // assigning the object
                    
    	$(window).scroll(function() {
                    
			// Scroll the background at var speed
			// the yPos is a negative value because we're scrolling it UP!								
			var yPos = -($window.scrollTop() / $bgobj.data('speed')); 
			
			// Put together our final background position
			var coords = '50% '+ yPos + 'px';

			// Move the background
			$bgobj.css({ backgroundPosition: coords });
		
		}); // window scroll Ends

 	});

    $(".topmenu li").on("click", function(event){
		$(".topmenu li").removeClass('active');
		$(this).addClass('active');
    	var gotoPoint = "#" + $(this).attr("data");

		$('html, body').animate({
			scrollTop: $(gotoPoint).offset().top
		}, 2000);
	});

});

/* Create HTML5 elements for IE */
document.createElement("nav");
document.createElement("article");
document.createElement("section");