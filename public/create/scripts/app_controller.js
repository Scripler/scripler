'use strict';

var app = angular.module( 'scriplerApp', [ 'ngRoute', 'ngSanitize', 'ngAnimate', 'LocalStorageModule', 'html5.sortable', 'angularFileUpload', 'angucomplete-alt', 'ngProgress', 'utilsSharedModule' ] );

app.controller('appController', [ '$http', '$scope', 'userService', '$rootScope', 'utilsService', 'modals', 'paymentService', '$window',
	function( $http, $scope, userService, $rootScope, utilsService, modals, paymentService, $window) {
		$scope.errors = {};
		$scope.errors.name = 'Name is empty';
		$scope.errors.email = 'Email is invalid';
		$scope.errors.password = 'Six characters minimum';
		$scope.registrationText = 'Hey, stranger. Register to save your work!';
		$scope.verificationEmailSent = false;
		$scope.socialRegistrationText = 'or use:';
		$scope.EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		$scope.showRegistrationInfoBar = true;
		$scope.user = {};

		// Opens the Upgrade modal
	    $scope.upgrade = function() {
			// the .open() method returns a promise that will be either
		    // resolved or rejected when the modal window is closed.
		    var upgradePromise = modals.open("upgrade");

		    upgradePromise.then(
			        function handleResolve(response) {
						if (response) {
							if (response == 'premium') {
								// TODO: should we just create one token when the page loads that can be used for both payment and downgrade?
								paymentService.setClient($window.braintree, function (err) {
									if (err) {
										alert("An error occurred connecting to the payment gateway: " + JSON.stringify(err));
									} else {
										paymentService.cancelSubscription($scope.user, function (err) {
											if (err) {
												alert("An error occurred cancelling your subscription: " + JSON.stringify(err));
											} else {
												// TODO: get the date on which the user's premium subscription ends
												// The user's level will not be changed until we receive cancellation confirmation from Braintree
												alert("Your subscription has now been cancelled. You will remain Premium until the end of your current billing period ends.");
											}
										});
									}
								});
							} else if (response == 'free') {
								// the .open() method returns a promise that will be either
								// resolved or rejected when the modal window is closed.
								var paymentPromise = modals.open("payment");

								paymentPromise.then(
									function handleResolve(response) {
										paymentService.setClient($window.braintree, function (err) {
											if (err) {
												alert("An error occurred connecting to the payment gateway: " + JSON.stringify(err));
											} else {
												var paymentCardNumber = response.cardNumber;
												var expirationDate = response.expirationDate;
												var cvv = response.cvv;
												paymentService.createSubscription(paymentCardNumber, expirationDate, cvv, function (err, data) {
													if (err) {
														// TODO: Inform the user that no money has been charged - or what?
														alert("An error occurred creating your subscription: " + JSON.stringify(err));
													}
													if (data) {
														$scope.user.level = data.user.level;
													} else {
														var errorMessage = "An error occurred creating your subscription";
														alert(errorMessage);
													}
												});
											}
										});
									},
									function handleReject(error) {
										if (error) alert("An error occurred closing the payment window: " + JSON.stringify(error));
									}
								);
							} else {
								alert("ERROR: upgrade modal promise did not contain either a 'free' or 'premium' value");
							}
						} else {
							alert("ERROR: not able to get response from upgrade modal promise");
						}
					},
			        function handleReject(error) {
						if (error) alert("An error occurred closing the upgrade window: " + JSON.stringify(error));
			        }
		        );
	    };

		$scope.$onRootScope('user:updated', function(event, user) {
			if (user.isDemo) {
				$scope.demoUser = user;
			} else {
				$scope.user = user;
				if (!$scope.user.emailVerified) {
					$scope.registrationText = 'Remove this message by verifying your email address. Click the link you received in your welcome email.';
				}
			}
		});

		$scope.$onRootScope('login:failed', function(event) {
				var demoId = Date.now();
				var password = utilsService.createRandomString(10);
				$scope.demoUser = {
					name: "Scripler Demo " + demoId,
					email: "demo-" + demoId + "@scripler.com",
					password: password,
					isDemo: true
				};

				$scope.registerUser($scope.demoUser, function (err, user) {
					if (err) {
						alert("ERROR registering demo user: " + JSON.stringify(err));
					} else {
						// TODO: emit 'user:registered' event when a demo user registers?
						$rootScope.$emit('user:registered', user);
					}
				});
		});

		// TODO: this check should include if user.emailVerified and user.isDemo
		$scope.showRegistrationBar = function(status) {
			if (status == 'hide') {
				$scope.showRegistrationInfoBar = false;
			}
			else {
				$scope.showRegistrationInfoBar = true;	
			}
		};

		$scope.$onRootScope('ckDocument:dataReady', function(event) {
			var editableBody = document.getElementById('cke_bodyeditor');
			var iframe = editableBody.getElementsByTagName('iframe')[0];
			var iDoc = iframe.contentWindow || iframe.contentDocument;
			if (iDoc.document) {
				iDoc = iDoc.document;
				iDoc.addEventListener('copy', $scope.copySelection);
				iDoc.addEventListener('cut', $scope.copySelection);
			};
		});

		$scope.copySelection = function() {
			var editor = $rootScope.ck;
			var selection = editor.getSelection();
			var selectedRanges = selection.getRanges();
			var bookmarks = selectedRanges.createBookmarks2(false);
			var startElement = selection.getStartElement();
			var range = selectedRanges[0];
			var elName = 'div';
			var isOneLine = false;
			var boundryNodes = range.getBoundaryNodes();

			//if one line selected then add original tags of the value
			if (boundryNodes.startNode.equals(boundryNodes.endNode)) {
				elName = startElement.getName();
				isOneLine = true;
			}

			var el = editor.document.createElement(elName);
			el.append(range.cloneContents());

			if (isOneLine) {
				if (startElement.hasAttribute('class')) {
					el.addClass(startElement.getAttribute('class'));
				}
			}

			$scope.copiedElement = el;

			$rootScope.ck.focus();
			selectedRanges.moveToBookmarks(bookmarks);
			selection.selectRanges(selectedRanges);
		}

		$scope.registerUser = function(user, next) {
			$http.post('/user/register', angular.toJson(user))
				.success(function(data) {
					$http.post('/user/login/', angular.toJson(user))
						.success(function(data) {
							next(null, data.user);
						});
				})
				.error(function(data) {
					next(data.errorDetails || 'Could not register user');
				});
		}
		$scope.resendUserVerificationEmail = function() {
			$http.post('/user/resend-verify-email')
				.success(function(data) {
					$scope.verificationEmailSent = true;
				})
				.error(function(data) {

				});
		}

		$scope.submitRegistration = function() {
			$scope.registrationSubmitted = true;
			$scope.registerForm.$pristine = false;
			$scope.registerForm.name.$pristine = false;
			$scope.registerForm.email.$pristine = false;
			$scope.registerForm.password.$pristine = false;

			if ($scope.registerForm.$valid) {
				$scope.user.isDemo = false;
				userService.updateUser($scope.user, function (err) {
					if (err) {
						if (err && err.errorDetails && err.errorDetails === 'Email already registered' ) {
							$scope.errors.email = err.errorDetails;
							$scope.registerForm.email.$invalid = true;
							$scope.registerForm.$invalid = true;
						}
					} else {
						$rootScope.$emit('user:registered', $scope.user);
						$scope.registrationText = 'Good job! We\'ve emailed you a confirmation link. You can keep writing, though...';
					}
				});
			}
		}

		/*
		$scope.setFormScope= function(scope){
			this.upgradePaymentFormScope = scope;
		}
		*/
}]);

app.config( function($routeProvider, $httpProvider, $provide) {

	$provide.decorator('$rootScope', [ '$delegate' , function($delegate) {

		Object.defineProperty($delegate.constructor.prototype, '$onRootScope', {
			value: function(name, listener){
				var unsubscribe = $delegate.$on(name, listener);
				this.$on('$destroy', unsubscribe);
			},
			enumerable: false
		});

		return $delegate;
	}]);

	var isLoggedIn = ['$q', '$http', '$timeout', '$rootScope', 'userService',
		function($q, $http, $timeout, $rootScope, userService) {
			var deferred = $q.defer();

			$http.get('/user')
				.success(function(data) {
					if (data.user) {
						userService.setUser(data.user);
						deferred.resolve(data.user);
					}
				})
				.error(function(data) {
					/*
					 Avoid displaying the demo user info in the input fields in the "Register" bar: Angular will
					 automatically reflect the changed model in the view (synchronization is not always smart!) so use
					 a "demoUser" variable and don't set the "real" user variable (which is also used from here on, i.e. in the app
					 equal to the demoUser variable until this point (e.g. we cannot set the value when the demo user is created)).

					 - demoUser = false, when going from the frontpage to projectspace (/), i.e. emit "login:failed" causing demo user creation.
					 - demoUser = true, when going from projectspace (/) to the app (/project)
					 */
					if (typeof $scope != 'undefined' && $scope.demoUser) {
						$scope.user = $scope.demoUser;
					} else {
						$rootScope.$emit('login:failed');
					}
					deferred.resolve();
				});

			return deferred.promise;
	}]

	$routeProvider
		.when('/', { templateUrl:'pages/create.html', controller: createController,
					resolve: { user: isLoggedIn }
					})
		.when('/project', { templateUrl:'pages/project.html', controller: projectController,
							resolve: { user: isLoggedIn }
							})
		.when('/error', { templateUrl:'pages/error.html' })
		.otherwise({ redirectTo:'/' });
});

app.service('projectsService', function($http, $q) {
	var projects = [];
	return {
		getList: function(user) {
			projects = [];

			$http.get('/project/list')
				.success( function(data) {
					angular.forEach(data.projects, function(project) {
						projects.push(project);
					})
				});

			return projects;
		},
		getProject: function(projectId) {
			var deferred = $q.defer();

			$http.get('/project/' + projectId)
				.success(function(data) {
					deferred.resolve(data.project);
				})

			return deferred.promise;
		}
	}
})

app.service('userService', function($rootScope, $http) {
	var user = {};

	return {
		setUser: function(user) {
			this.user = user;
			if (user.password) {
				delete user.password; // No need to store user password hash.
			}
			$rootScope.$emit('user:updated', this.user);
		},
		getUser: function() {
			return this.user;
		},
		updateUser: function(user, next) {
			var self = this;
			$http.put('/user', angular.toJson(user))
				.success( function(data) {
					self.setUser(data.user);
					if (next) {
						return next();
					}
				})
				.error(function(data) {
					return next(data);
				});
		},
		openFeedback: function (user) {
			var hostname = 'http://talk.scripler.com';
			var path = '/c/feedback';
			var url = hostname+path;
			if (user && user._id && !user.isDemo) {
				// Since this is a registered user, we can send him to the auto-login url.
				url = hostname+'/session/sso?return_path='+encodeURIComponent(path);
			}
			window.open(url);
		}
	};
});

app.service('paymentService', function($http, $q) {
	var client;

	return {
		setClient: function($braintree, next) {
			$http.get('/payment/token')
				.success( function(data) {
					if (data && data.token) {
						//var client = new braintree.api.Client({clientToken: data.token});
						client = new $braintree.api.Client({
							clientToken: data.token
						});
						return next(null, data);
					} else {
						if (next) {
							return next("An error occurred connecting to the payment gateway: unable to get payment token (empty)", data);
						}
					}
				})
				.error(function(data) {
					if (next) {
						return next("An error occurred connecting to the payment gateway: unable to get payment token: " + JSON.stringify(data));
					}
				});
		},
		createSubscription: function(cardNumber, expirationDate, cvv, next) {
			client.tokenizeCard({number: cardNumber, expirationDate: expirationDate, cvv: cvv}, function (err, nonce) {
				if (err) return next(err);

				var nonceData = { "payment_method_nonce": nonce	};
				$http.post('/payment/subscription', nonceData)
					.success( function(data) {
						if (next) {
							return next(null, data);
						}
					})
					.error(function(data) {
						if (next) {
							return next(data);
						}
					});
			});
		},
		cancelSubscription: function(user, next) {
			$http.delete('/payment/subscription', user)
				.success( function() {
					if (next) {
						return next();
					}
				})
				.error(function(data) {
					if (next) {
						return next(data);
					}
				});
		}
	};
});

app.filter('filterTruncation', function () {
    return function (input, chars) {
        if (isNaN(chars)) {
            return input;
        }
        if (chars <= 0) {
            return '';
        }
        if (input && input.length > chars) {
            input = input.substring(0, chars);
            while (input.charAt(input.length - 1) === ' ' || input.charAt(input.length - 1) === '.' || input.charAt(input.length - 1) === ',') {
                input = input.substr(0, input.length - 1);
            }

            return input + '…';
        }

        return input;
    };
})

app.directive('confirmSaveOnExit', function($window, $location, $route) {
	return {
		link: function(scope, elem, attrs) {

			function confirmSaveChanges(event) {
				var updateProjectDocumentPromise = scope.updateProjectDocument();
				updateProjectDocumentPromise.then(function() {
					return true;
				}, function() {
					event.preventDefault();
				});
			}

/*			$window.onbeforeunload = function(event){
				if ($location.path() === "/project" && !scope.lastSaved) {
					var message = 'If you leave this page you are going to lose all unsaved changes, are you sure you want to leave?';
					if (typeof event == 'undefined') {
						event = $window.event;
					}
					if (event) {
						event.returnValue = message;
				    }

				    confirmSaveChanges(event);
				    return message;
				};
			}; */

			scope.$on('$locationChangeStart', function(event, next, current) {
				if ($location.path() === "/") {
					confirmSaveChanges(event);
				};
			});

        }
	};
});

app.directive('onClickChangeText', function($timeout, $parse) {
	return {
		link: function( scope, element, attrs ) {
			element.bind('focus', function() {
				if (attrs.id === 'reg-name') {
					scope.registrationText = 'Type in your name...';
				}
				if (attrs.id === 'reg-email') {
					scope.registrationText = 'Now your email. You can verify it shortly...';
				}
				if (attrs.id === 'reg-password') {
					scope.registrationText = 'Nice. Now choose a good password.';
				}

				scope.$digest();
			});
		}
	};
});

app.directive('focusOn', function($timeout, $parse) {
	return {
		link: function( scope, element, attrs ) {
			var model = $parse( attrs.focusOn );
			scope.$watch(model, function( value ) {
				if( value === true ) {
					$timeout( function() {
						element[0].select();
					});
				}
			});
		}
	};
});

app.directive('blurOnEnter', function() {
	return function(scope, element, attributes) {
		element.bind("keydown keypress", function(event) {
			if(event.which === 13) {
				event.preventDefault();
				element[0].blur();
			};
		});
	}
});

app.directive('selectOnClick', function () {
	return {
	  restrict: 'AC',
	  link: function (scope, element, attrs) {
	    element.bind('click', function () {
	      this.select();
	    });
	  }
	}
});

app.directive('ckEditor', function($window, $rootScope, $timeout) {
	return {
		require: '?ngModel',
		link: function(scope, elm, attr, ngModel) {
			var ck = CKEDITOR.replace('bodyeditor', {
				allowedContent: true,
				skin: 'scripler',
				bodyId: 'scripler',
				resize_enabled: false,
				extraPlugins: 'scripler,floating-tools,lineHeight,texttransform,colordialog,colorbutton,indent-right,indentations,scripler_pagebreak,imageScripler,linkScripler',
				floatingtools: 'Basic',
				floatingtools_Basic: [
					{ name: 'styles', items: [ 'Font' ] },
					'/',
					{ name: 'format', items: [ 'Format' ] },
					'/',
					{ name: 'fontstyles', items: [ 'FontSize', 'LineHeight' ] },
					'/',
					['Bold'], ['Italic'], ['Underline'], ['TransformTextToUppercase'], ['Subscript'], ['Superscript'], 
					'/',
					['JustifyLeft'], ['JustifyCenter'], ['JustifyRight'], ['JustifyBlock'], ['NumberedList'], ['BulletedList'],
					'/',
					['Indent'], ['IndentRight'], ['IndentTop'], ['IndentBottom'], ['IndentText'],
					'#',
					['IndentLeftIcon'], ['IndentRightIcon'], ['IndentTopIcon'], ['IndentBottomIcon'], ['IndentTextIcon'],
					'#',
					['Outdent'], ['OutdentRight'], ['OutdentTop'], ['OutdentBottom'], ['OutdentText']
				],
				indentUnit: 'em',
				indentOffset: 2,
				enterMode: CKEDITOR.ENTER_P,
				height: 'calc(100% - 36px)',
				width: '100%',
				language: 'en',
				//Change to standard font we want to start all projects with :)
				contentsCss: ['ckeditor/contents.css', 'stylesets/non-editable.css'],
				//Load css sheet via angualr here
				toolbar: [
					['Undo'], ['Redo'], ['Bold'], ['Italic'], ['Underline'], ['Strike'], ['TextColor'], ['BGColor'], ['JustifyLeft'], ['JustifyCenter'], ['JustifyRight'], ['JustifyBlock'], ['NumberedList'], ['BulletedList'], ['imageScripler'], ['linkScripler']
				],
				removeButtons: 'language,CreateDiv,Flash,Iframe'
			});

			if (!ngModel) return;

			$rootScope.modelTimeout = null;
			function timeOutModel(event) {
				if (event.name === 'dataReady') {
					$rootScope.$emit('ckDocument:dataReady');
				}
				if (event) {
					if (event.data) {
						if (event.data.keyCode !== 13) {
							if ($rootScope.modelTimeout) {
								$timeout.cancel($rootScope.modelTimeout);
							}
							$rootScope.modelTimeout = $timeout(updateModel, 1000);
						}
					}
				}
			}

			function updateModel() {
				if (!scope.$$phase) {
					scope.$apply(function() {
						ngModel.$setViewValue(ck.getData());
					});
				}
			}

			ck.on('paste', function(event) {
				//TODO check for pasted value vs copiedElement
				if (scope.copiedElement) {
					event.stop();

					var el = scope.copiedElement.clone(true);
					var headingsArray = [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ];

					if (headingsArray.indexOf(el.getName()) > -1 ) {
						el.$.id = 'id_' + Date.now();
					}

					if (el.$.children.length > 0) {
						for (var i = 0; i < el.$.children.length; i++) {
							var child = el.$.children[i];

							if (child.tagName === 'A') {
								if (child.hasAttribute('name') && child.hasAttribute('title')) {
									child.remove();
								}
							}

							if (child.tagName === 'IMG') {
								if (child.hasAttribute('class')) {
									if (child.getAttribute('class') === 'cke_anchor') {
										child.remove();
									}
								}
							}

							try {
								if (headingsArray.indexOf(child.nodeName.toLowerCase()) > -1) {
									child.id = "id_" + Date.now() + i;
								}
							} catch (e) {
								//anchor does not have getName method
							}
						}
					}

					ck.insertElement(el);
				}
			});
			ck.on('key', function(event) { timeOutModel(event); });
			ck.on('dataReady', function(event) { $rootScope.$emit('ckDocument:dataReady'); timeOutModel(event); });
			/*ck.on('save', function() {
				ngModel.$setViewValue(ck.getData());
			});*/

			ngModel.$render = function(value) {
				ck.setData(ngModel.$viewValue);
				$rootScope.$emit('ckDocument:renderFinished');
			};

			if (CKEDITOR.env.ie && CKEDITOR.env.version < 9) {
				CKEDITOR.tools.enableHtml5Elements( document );
			}

			ck.on('instanceReady', function() {
				ck.setData(ngModel.$viewValue);
				$rootScope.$emit('ckDocument:ready');
			});

			$rootScope.ck = ck;
			$rootScope.CKEDITOR = CKEDITOR;
		}
	};
});


/*****
 *
 * Modal controller, service and directive
 * Copied from http://www.bennadel.com/blog/2806-creating-a-simple-modal-system-in-angularjs.htm
 *
 * *****/

// controls the Upgrade modal window
app.controller("UpgradeModalController", [ '$scope', 'modals', 'utilsService',
	function( $scope, modals, utilsService ) {
        var params = modals.params();

		$scope.freeNumberOfEbooks = utilsService.subscriptions.free.maxNumberOfProjects;
		$scope.freeNumberOfDesigns = utilsService.subscriptions.free.maxNumberOfDesigns;

		$scope.premiumNumberOfEbooks = utilsService.subscriptions.premium.maxNumberOfProjects;
		$scope.premiumNumberOfDesigns = utilsService.subscriptions.premium.maxNumberOfDesigns;
		$scope.premiumMonthlyPrice = utilsService.subscriptions.premium.monthlyPrice;

        // setup defaults using the modal params.
		// TODO: use isPremium() function from projectController, once "premium-logic" branch has been merged in
        $scope.useFreeText = ( params.useFree || ($scope.user.level && $scope.user.level == 'free' ? "Continue as Free" : 'Downgrade to Free') );
        $scope.usePremiumText = ( params.usePremium || ($scope.user.level && $scope.user.level == 'premium' ? "Continue as Premium" : "Upgrade to Premium") );

		$scope.useFree = function() {
			if (params.useFree || ($scope.user.level && $scope.user.level == 'premium')) {
				modals.resolve($scope.user.level);
			} else {
				modals.reject();
			}
		};

		$scope.usePremium = function() {
			if (params.usePremium || ($scope.user.level && $scope.user.level == 'free')) {
				modals.resolve($scope.user.level);
			} else {
				modals.reject();
			}
		};

        // wire the modal buttons into modal resolution actions.
		//$scope.useFree = ( params.useFree || ($scope.user.level && $scope.user.level == 'premium' ? modals.resolve : modals.reject) );
        //$scope.usePremium = ( params.usePremium || ($scope.user.level && $scope.user.level == 'free' ? modals.resolve : modals.reject) );
    }]
);

// controls the Payment modal window
app.controller("PaymentModalController",
	function( $scope, modals ) {
		var params = modals.params();

		// wire the modal buttons into modal resolution actions.
		// TODO: implement real validation of card number, expire date and cvv
		$scope.paymentUpgrade = function() {
			if (!$scope.payment.cardNumber) {
				alert("Please enter a valid card number");
			}

			modals.resolve($scope.payment);
		};

		$scope.paymentCancel = modals.reject;
	}
);

// manages the modals within the application
app.service("modals",
    function( $rootScope, $q ) {
        // represents the currently active modal window instance
        var modal = {
            deferred: null,
            params: null
        };

        // returns the public API
        return({
            open: open,
            params: params,
            proceedTo: proceedTo,
            reject: reject,
            resolve: resolve
        });

        // Opens a modal of the given type, with the given params. If a modal
        // window is already open, you can optionally pipe the response of the
        // new modal window into the response of the current (cum previous) modal
        // window. Otherwise, the current modal will be rejected before the new
        // modal window is opened.
        function open( type, params, pipeResponse ) {
            var previousDeferred = modal.deferred;

            // setup the new modal instance properties
            modal.deferred = $q.defer();
            modal.params = params;

            // We're going to pipe the new window response into the previous
            // window's deferred value.
            if ( previousDeferred && pipeResponse ) {

                modal.deferred.promise
                    .then( previousDeferred.resolve, previousDeferred.reject );

            // We're not going to pipe, so immediately reject the current window.
            } else if ( previousDeferred ) {
                previousDeferred.reject();
            }

            // Since the service object doesn't (and shouldn't) have any direct
            // reference to the DOM, we are going to use events to communicate
            // with a directive that will help manage the DOM elements that
            // render the modal windows.

            // NOTE: We could have accomplished this with a $watch() binding in
            // the directive; but, that would have been a poor choice since it
            // would require a chronic watching of acute application events.
            $rootScope.$emit( "modals.open", type );

            return( modal.deferred.promise );

        }


        // returns the params associated with the current params
        function params() {
            return( modal.params || {} );
        }

        // opens a modal window with the given type and pipe the new window's
        // response into the current window's response without rejecting it
        // outright

        // This is just a convenience method for .open() that enables the
        // pipeResponse flag; it helps to make the workflow more intuitive.
        function proceedTo( type, params ) {
            return( open( type, params, true ) );
        }

        // rejects the current modal with the given reason
        function reject( reason ) {
            if ( ! modal.deferred ) {
                return;
            }

            modal.deferred.reject( reason );
            modal.deferred = modal.params = null;

            // tell the modal directive to close the active modal window
            $rootScope.$emit( "modals.close" );
        }

        // resolves the current modal with the given response
        function resolve( response ) {
            if ( ! modal.deferred ) {
                return;
            }

            modal.deferred.resolve( response );
            modal.deferred = modal.params = null;

            // tell the modal directive to close the active modal window
            $rootScope.$emit( "modals.close" );
        }

    }
);


// Manages the views that are required to render the modal windows.
// It doesn't actually define the modals in anyway - it simply decides which DOM sub-tree
// should be linked. The means by which the modal window is defined is entirely up to the developer.
app.directive("bnModals",
    function( $rootScope, modals ) {
        // return the directive configuration
        return( link );

        // binds the JavaScript events to the scope
        function link( scope, element, attributes ) {
            // Defines which modal window is being rendered. By convention,
            // the subview will be the same as the type emitted by the modals
            // service object.
            scope.subview = null;
            
            // If the user clicks directly on the backdrop (ie, the modals
            // container), consider that an escape out of the modal, and reject
            // it implicitly.
            element.on("click",
                function handleClickEvent( event ) {
                    if ( element[ 0 ] !== event.target ) {
                        return;
                    }

                    scope.$apply( modals.reject );

                }
            );

            // listen for "open" events emitted by the modals service object
            $rootScope.$on("modals.open",
                function handleModalOpenEvent( event, modalType ) {
                    scope.subview = modalType;
                }
            );

            // listen for "close" events emitted by the modals service object
            $rootScope.$on("modals.close",
                function handleModalCloseEvent( event ) {
                    scope.subview = null;
                }
            );

        }

    }
);