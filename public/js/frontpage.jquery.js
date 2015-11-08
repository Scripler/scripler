$(document).ready(function() {
    var documentwidth = $(window).width();

    $('#map_canvas1').addClass('scrolloff'); // set the pointer events to none on doc ready
    $('#canvas1').on('click', function() {
        $('#map_canvas1').removeClass('scrolloff'); // set the pointer events true on click
    });

    // you want to disable pointer events when the mouse leave the canvas area;

    $("#map_canvas1").mouseleave(function() {
        $('#map_canvas1').addClass('scrolloff'); // set the pointer events to none when mouse leaves the map area
    });


    function isScrolledIntoView(elem) {
        var docViewTop = $(window).scrollTop();
        var docViewBottom = docViewTop + $(window).height();

        var elemTop = $(elem).offset().top;
        var elemBottom = elemTop + $(elem).height();

        return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom) && (elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    }

    $( ".menu-login" ).click(function() {
        if (!isScrolledIntoView($("#login"))) {
            $("#login").slideToggle();
            $('html, body').stop(true, true).animate({
                scrollTop: $("#login").offset().top
            }, 800);
        }
        $("#login").slideToggle();
    });

    $( "#signUp" ).click(function() {
        if (!isScrolledIntoView($("#contact"))) {
                $('html, body').stop(true, true).animate({
                    scrollTop: $("#contact").offset().top
                }, 800);
            }
    });

    $(".navbar-nav .navpoint a").on("click", function(event) {
        if ($(this).attr("data") != "blog" && $(this).attr("data") != "talk" && $(this).attr("data") != "login") {
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
                $('html, body').stop(true, true).animate({
                    scrollTop: $(gotoPoint).offset().top
                }, 800);
            }
        }
    });

    $(".newsletter-signup-text").on("click", function(event) {
        if (!isScrolledIntoView($("#mc_embed_signup"))) {
            $('html, body').stop(true, true).animate({
                scrollTop: $("#mc_embed_signup").offset().top
            }, 800);
        }
    });


    $("#login-form").submit(function(event) {
        event.preventDefault();
        hideInvalidBoxes();

        var formOk = true;
        var password = $("#login-password").val();
        var email = $("#login-email").val();

        if (forgotPassword) {
            if (!utils.isValidEmail(email)) {
                invalidBox(1, "Invalid email address");
                formOk = false;
            }
            if (formOk) {
                $.ajax({
                    url: '/user/password-reset',
                    type: 'POST',
                    data: {
                        "email": $("#login-email").val()
                    },
                    dataType: 'json',
                    success: function(data) {
                        formSuccess("If you entered your correct email address, an email has been sent to you. By using the link in this email you can change your password.");
                    },
                    error: function(xhr, textStatus, error) {
                        invalidBox(3, "Error");
                    }
                });
            }
        } else {
            if (!utils.isValidEmail(email)) {
                invalidBox(1, "Invalid email address");
                formOk = false;
            }
            if (!isValidPassword(password)) {
                invalidBox(2, "Six characters minimum");
                formOk = false;
            }

            if (formOk) {
                console.log("Second login request...");
                $.ajax({
                    url: '/user/login',
                    type: 'POST',
                    data: {
                        "email": email,
                        "password": password,
                        "remember": $("#remember").val()
                    },
                    dataType: 'json',
                    success: function(data) {
                        document.location.href = "/create/";
                    },
                    error: function(xhr, textStatus, error) {
                        console.log("Login failed: " + error);
                        invalidBox(3, "Login failed");
                    }
                });
            }
        }
    });
    if (documentwidth < 850) {
        $('li.menu-login>a').click(function() {
            $('#login').css("z-index", "10");
        });
        $('li.navpoint>a').click(function() {
            $("button.navbar-toggle").attr("aria-expanded", "false");
            $('#navbar').removeClass("in");
        });
        $('button.navbar-toggle').click(function() {
            if ($("button.navbar-toggle").attr("aria-expanded") == true) {
                $("button.navbar-toggle").attr("aria-expanded", false);
            } else {
                $("button.navbar-toggle").attr("aria-expanded", true);
            }
        });

    }
    var forgotPassword = false;
    $("#forgot-password").on("click", function(event) {
        hideInvalidBoxes();
        var animationTime = 400;
        var passwordWidth = $("#login-password").parent().outerWidth(true);
        if (!forgotPassword) {
            $("#login-password").parent().animate({
                "width": 0,
                "padding": 0,
                "margin": 0,
                "opacity": 0
            }, animationTime, function () {
                // After animation compleation
                $("#login-button").prop("value", "Reset password");
                $("#login-button").css("fontSize", "80%");
                $("#forgot-password").text("Cancel");
                $("#remember-me-box").hide();
                $(this).hide();
            });
            if (documentwidth > 1050) {
                $("#login-wrapper").animate({
                    "left": passwordWidth
                }, animationTime);
            }
            forgotPassword = true;
        } else {
            resetLoginForm();
        }
    });

    function resetLoginForm() {
        $("#login-password").parent().removeAttr("style");
        $("#login-email").removeAttr("style");
        $("#login-form").removeAttr("style");
        $("#login-wrapper").removeAttr("style");
        $("#remember-me-box").removeAttr("style");
        $("#login-button").removeAttr("style");
        $("#login-button").prop("value", "Login");
        $("#forgot-password").text("Forgot password?");
        forgotPassword = false;
    }

    $(".menu-login").on("click", function(event) {
        // Ensure that it's the normal login form that is shown.
        hideInvalidBoxes();
        $("#login-form").css("display", "block");
        $("#password-reset-form").css("display", "none");
        $("#form-success").css("display", "none");
        resetLoginForm();
    });
    $(".menu-login").on("click", function(event) {
        $(":animated").promise().done(function() {
            $("#login-email").focus();
        });
    });

    // Handle the password reset entry page
    if (location.hash && location.hash.indexOf("#password-reset") === 0) {
        var args = location.hash.substring(1).split('/');
        var userId = args[1];
        var token = args[2];

        // Switch login-article from login-form to password-reset-form, and display immediately
        $("#login-form").css("display", "none");
        $("#login").css("display", "block");
        $("#password-reset-form").css("display", "block");

        $("#password-reset-button").on("click", function(event) {
            event.preventDefault();
            hideInvalidBoxes();
            var password = $("#password1").val();
            if (password == $("#password2").val()) {
                if (isValidPassword(password)) {
                    $.ajax({
                        url: '/user/' + userId + '/password-change',
                        type: 'POST',
                        data: {
                            "password": password,
                            "token": token
                        },
                        dataType: 'json',
                        success: function(data) {
                            formSuccess("Your password has been changed.");
                        },
                        error: function(xhr, textStatus, error) {
                            console.log("Failed password change: " + error);
                            invalidBox(6, "Error");
                        }
                    });
                } else {
                    invalidBox(4, "Six characters minimum");
                }
            } else {
                invalidBox(5, "Passwords do not match");
            }
        });
    }

    // Check if user is already logged in
    $.ajax({
        url: '/user',
        type: 'GET',
        data: {},
        dataType: 'json',
        success: function(data) {
            if (data && data.user) {
                var user = data.user;
                // Non-demo user is already logged in.
                // It must be possible for existing users who have not logged in, clicked "Go" and then gone back to the frontpage, to log in
                // but we do not want to show "calculated" demo user names ("Scripler Demo <timestamp>").
                if (!user.isDemo && user.firstname) {
                    $(".menu-loggedin").css("display", "inline");
                    $(".menu-loggedin").attr("title", "You are logged in as " + data.user.firstname);
                    $(".menu-login").css("display", "none");
                    $("#login").css("display", "none");
                } else if (user.isDemo) {
                    $(".menu-login").css("display", "inline");
                }
            }
        },
        error: function(request, status, error) {
    
        }
    });

    function formSuccess(message) {
        resetLoginForm();
        $("#form-success-text").text(message);
        $("#form-success").css("display", "block");
        $("#login-form").css("display", "none");
        $("#password-reset-form").css("display", "none");
    }

    function invalidBox(boxNum, message) {
        var box = $("#invalid-box" + boxNum);
        box.css("display", "block");
        box.text(message);
    }

    function hideInvalidBoxes() {
        for(i = 1; i <= 6; i++){
            $("#invalid-box"+i).css("display", "none");
        }
    }

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
});

$('[data-rel=popup-iframe]').magnificPopup({type:'iframe'});

/* Create HTML5 elements for IE */
document.createElement("nav");
document.createElement("article");
document.createElement("section");

function socialLogin(provider) {
    window.ga('send', {
        hitType: 'event',
        eventCategory: 'Onboarding',
        eventAction: 'Fonrtpage social login',
        eventValue: provider,
        hitCallback: function() {
            $window.location = 'auth/'+provider;
        }
    });
    return false;
}