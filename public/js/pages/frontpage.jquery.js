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

    var scroll_pos = 0;
    var animation_begin_pos = 0; //where you want the animation to begin
    var animation_mid_first_pos = $('#create').height();
    var animation_mid_second_pos = animation_mid_first_pos + $('#features').height();
    var animation_mid_third_pos = animation_mid_second_pos + $('#news').height();
    var animation_mid_fourth_pos = animation_mid_third_pos + $('#pricing').height();
    var animation_mid_fifth_pos = animation_mid_fourth_pos + $('#learn').height();
    var animation_mid_sixth_pos = animation_mid_fifth_pos + $('#about').height();
    var animation_end_pos = animation_mid_sixth_pos + $('#contact').height(); //where you want the animation to stop

    //first  #C6C6C6  rgb(198,198,198)
    //second  #215660  rgb(33,86,96)
    //third  #FFF56C  rgb(255,245,108)
    //fourth  #C6C6C6  rgb(198,198,198)
    //fifth  #666666  rgb(102,102,102)
    //sixth  #215660  rgb(33,86,96)
    //seventh  #ffffff  rgb(255,255,255)

    var beginning_color = new $.Color( 'rgb(198,198,198)' ); //we can set this here, but it'd probably be better to get it from the CSS; for the example we're setting it here.
    var second_color = new $.Color( 'rgb(33,86,96)' );
    var third_color = new $.Color( 'rgb(255,245,108)' );
    var fourth_color = new $.Color( 'rgb(198,198,198)' );
    var fifth_color = new $.Color( 'rgb(102,102,102)' );
    var sixth_color = new $.Color( 'rgb(33,86,96)' );
    var ending_color = new $.Color( 'rgb(255,255,255)' ); //what color we want to use in the end

    $(document).scroll(function() {
        scroll_pos = $(this).scrollTop();

        if(scroll_pos >= animation_begin_pos && scroll_pos <= animation_end_pos ) { 

        	var percentScrolled = "";
        	var newColor = "";
        	var newRed = "";
        	var newGreen = "";
        	var newBlue = "";
        	var bodyElement = $('body');

            //we want to calculate the relevant transitional rgb value
            if(scroll_pos >= animation_begin_pos && scroll_pos <= animation_mid_first_pos) {
	            percentScrolled = scroll_pos / ( animation_mid_first_pos - animation_begin_pos );
	            newRed = beginning_color.red() + ( ( second_color.red() - beginning_color.red() ) * percentScrolled );
	            newGreen = beginning_color.green() + ( ( second_color.green() - beginning_color.green() ) * percentScrolled );
	            newBlue = beginning_color.blue() + ( ( second_color.blue() - beginning_color.blue() ) * percentScrolled );
	            
	            newColor = new $.Color( newRed, newGreen, newBlue );
	            bodyElement.animate({ backgroundColor: newColor }, 0);
            }
            else if(scroll_pos > animation_mid_first_pos && scroll_pos <= animation_mid_second_pos) {
	            percentScrolled = ( scroll_pos - animation_mid_first_pos ) / ( animation_mid_second_pos - animation_mid_first_pos );
	            newRed = second_color.red() + ( ( third_color.red() - second_color.red() ) * percentScrolled );
	            newGreen = second_color.green() + ( ( third_color.green() - second_color.green() ) * percentScrolled );
	            newBlue = second_color.blue() + ( ( third_color.blue() - second_color.blue() ) * percentScrolled );
	            
	            newColor = new $.Color( newRed, newGreen, newBlue );
	            bodyElement.animate({ backgroundColor: newColor }, 0);
            }
            else if(scroll_pos > animation_mid_second_pos && scroll_pos <= animation_mid_third_pos) {
	            percentScrolled = ( scroll_pos - animation_mid_second_pos ) / ( animation_mid_third_pos - animation_mid_second_pos );
	            newRed = third_color.red() + ( ( fourth_color.red() - third_color.red() ) * percentScrolled );
	            newGreen = third_color.green() + ( ( fourth_color.green() - third_color.green() ) * percentScrolled );
	            newBlue = third_color.blue() + ( ( fourth_color.blue() - third_color.blue() ) * percentScrolled );
	            
	            newColor = new $.Color( newRed, newGreen, newBlue );
	            bodyElement.animate({ backgroundColor: newColor }, 0);
            }
            else if(scroll_pos > animation_mid_third_pos && scroll_pos <= animation_mid_fourth_pos) {
	            percentScrolled = ( scroll_pos - animation_mid_third_pos ) / ( animation_mid_fourth_pos - animation_mid_third_pos );
	            newRed = fourth_color.red() + ( ( fifth_color.red() - fourth_color.red() ) * percentScrolled );
	            newGreen = fourth_color.green() + ( ( fifth_color.green() - fourth_color.green() ) * percentScrolled );
	            newBlue = fourth_color.blue() + ( ( fifth_color.blue() - fourth_color.blue() ) * percentScrolled );
	            
	            newColor = new $.Color( newRed, newGreen, newBlue );
	            bodyElement.animate({ backgroundColor: newColor }, 0);
            }
            else if(scroll_pos > animation_mid_fourth_pos && scroll_pos <= animation_mid_fifth_pos) {
	            percentScrolled = ( scroll_pos - animation_mid_fourth_pos ) / ( animation_mid_fifth_pos - animation_mid_fourth_pos );
	            newRed = fifth_color.red() + ( ( sixth_color.red() - fifth_color.red() ) * percentScrolled );
	            newGreen = fifth_color.green() + ( ( sixth_color.green() - fifth_color.green() ) * percentScrolled );
	            newBlue = fifth_color.blue() + ( ( sixth_color.blue() - fifth_color.blue() ) * percentScrolled );
	            
	            newColor = new $.Color( newRed, newGreen, newBlue );
	            bodyElement.animate({ backgroundColor: newColor }, 0);
            }
             else if(scroll_pos > animation_mid_fifth_pos && scroll_pos <= animation_mid_sixth_pos) {
	            percentScrolled = ( scroll_pos - animation_mid_fifth_pos ) / ( animation_mid_sixth_pos - animation_mid_fifth_pos );
	            console.log(percentScrolled);
	            newRed = sixth_color.red() + ( ( ending_color.red() - sixth_color.red() ) * percentScrolled );
	            newGreen = sixth_color.green() + ( ( ending_color.green() - sixth_color.green() ) * percentScrolled );
	            newBlue = sixth_color.blue() + ( ( ending_color.blue() - sixth_color.blue() ) * percentScrolled );
	            
	            newColor = new $.Color( newRed, newGreen, newBlue );
	            bodyElement.animate({ backgroundColor: newColor }, 0);
            }
/*            else if(scroll_pos > animation_mid_second_pos && scroll_pos <= animation_mid_third_pos) {
	            percentScrolled = ( scroll_pos - animation_mid_second_pos ) / ( animation_mid_third_pos - animation_mid_second_pos );
	            console.log(percentScrolled);
	            newRed = third_color.red() + ( ( fourth_color.red() - third_color.red() ) * percentScrolled );
	            newGreen = third_color.green() + ( ( fourth_color.green() - third_color.green() ) * percentScrolled );
	            newBlue = third_color.blue() + ( ( fourth_color.blue() - third_color.blue() ) * percentScrolled );
	            
	            newColor = new $.Color( newRed, newGreen, newBlue );
	            $('body').animate({ backgroundColor: newColor }, 0);
            }*/
        }
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