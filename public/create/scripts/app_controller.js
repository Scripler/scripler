'use strict';

var app = angular.module( 'scriplerApp', [ 'ngRoute', 'ngSanitize', 'LocalStorageModule', 'html5.sortable', 'angularFileUpload', 'angucomplete-alt', 'ngProgress', 'utilsSharedModule' ] );

app.controller('appController', [ '$http', '$scope', 'userService', '$rootScope', 'utilsService',
	function( $http, $scope, userService, $rootScope, utilsService) {
		$scope.errors = {};
		$scope.errors.name = 'Name is empty';
		$scope.errors.email = 'Email is invalid';
		$scope.errors.password = 'Six characters minimum';
		$scope.registrationText = 'Hey, stranger. Register to save your work!';
		$scope.socialRegistrationText = 'or use:';
		$scope.EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		$scope.user = {};

		$scope.registrationBarHiddenByUser = false;

		var ckeOrgHeight;
		var currentBarOffset = 0;

		$rootScope.updateBottomOffset = function() {
			var bar = document.getElementById("registrationFooter");
			var height = bar ? bar.offsetHeight : 0;
			if (currentBarOffset != height) {
				var editor = document.getElementById("cke_1_contents");
				if (editor && editor.style.height) {
					currentBarOffset = height;
					if (!ckeOrgHeight) {
						ckeOrgHeight = editor.style.height;
					}
					if (height > 0) {
						var newHeight = ckeOrgHeight.replace('px', '') - height;
						editor.style.height = newHeight + 'px';
					} else {
						editor.style.height = ckeOrgHeight;
					}
				}
			}

			var elements = document.getElementsByClassName('bottom-fixed');
			for (var i = 0; i < elements.length; i++) {
				elements[i].style.bottom = height + 'px';
			}
			elements = document.getElementsByClassName('full-height');
			for (var i = 0; i < elements.length; i++) {
				elements[i].style.height = 'calc(100% - ' + height + 'px)';
				elements[i].style.minHeight = 'calc(100% - ' + height + 'px)';
			}

			var styleEditor = document.getElementById("cke_1_floatingtools");
			if (styleEditor) {
				var defaultOffset = 28; // From hardcoded value in floating-tools CK plugin.
				var currentOffset = styleEditor.style.bottom.replace('px', '');
				// If current offset is negative, it's hidden, so don't mess with it
				if (currentOffset > 0) {
					styleEditor.style.bottom = (defaultOffset + height) + 'px';
				}
			}
		}

		$rootScope.updateNotificationOffset = function() {
			var notifications = document.getElementById("notification-area");	
			notifications.setAttribute('class', 'notifications loggedin');
		}

		$scope.$watch('registrationBarHiddenByUser', function () {
			// Wait for the registration-bar visual changes before updating bottom offset.
			setTimeout(function () {
				$rootScope.updateBottomOffset();
			}, 0);
		});

		$scope.$onRootScope('user:updated', function( event, user ) {
			if (user.isDemo) {
				$scope.demoUser = user;
			} else {
				$scope.user = user;
				if (!$scope.user.emailVerified) {
					$scope.registrationText = 'Remove this message by verifying your email address. Click the link you received in your welcome email.';
					$rootScope.updateNotificationOffset();
				}
			}
			// Wait for the registration-bar visual changes before updating bottom offset.
			setTimeout(function () {
				$rootScope.updateBottomOffset();
			}, 0);
		});

		$scope.$onRootScope('login:failed', function( event ) {
				var demoId = Date.now();
				var password = utilsService.createRandomString(10);
				$scope.demoUser = {
					name: "Scripler Demo " + demoId,
					email: "demo-" + demoId + "@scripler.com",
					password: password,
					isDemo: true
				};

				$scope.registerUser($scope.demoUser, function (err) {
					if (err) {
						// TODO: show "something went wrong" error to the user
						console.log("ERROR registering demo user: " + JSON.stringify(err));
					} else {
						// TODO: emit 'user:registered' event when a demo user registers?
						//$rootScope.$emit('user:registered', $scope.demoUser);
					}
				});
		});

		$scope.$onRootScope('ckDocument:dataReady', function( event ) {
			var editableBody = document.getElementById('cke_bodyeditor');
			var iframe = editableBody.getElementsByTagName('iframe')[0];
			var iDoc = iframe.contentWindow || iframe.contentDocument;
			if ( iDoc.document ) {
				iDoc = iDoc.document;
				iDoc.addEventListener('copy', $scope.copySelection);
				iDoc.addEventListener('cut', $scope.copySelection);
			};
			$rootScope.updateBottomOffset();
		});

		$scope.copySelection = function() {
			var editor = $rootScope.ck;
			var selection = editor.getSelection();
			var selectedRanges = selection.getRanges();
			var bookmarks = selectedRanges.createBookmarks2( false );
			var startElement = selection.getStartElement();
			var range = selectedRanges[0];
			var elName = 'div';
			var isOneLine = false;
			var boundryNodes = range.getBoundaryNodes();

			//if one line selected then add original tags of the value
			if ( boundryNodes.startNode.equals( boundryNodes.endNode ) ) {
				elName = startElement.getName();
				isOneLine = true;
			}

			var el = editor.document.createElement( elName );
			el.append( range.cloneContents() );

			if ( isOneLine ) {
				if ( startElement.hasAttribute( 'class' ) ) {
					el.addClass( startElement.getAttribute( 'class' ) );
				}
			}

			$scope.copiedElement = el;

			$rootScope.ck.focus();
			selectedRanges.moveToBookmarks( bookmarks );
			selection.selectRanges( selectedRanges );
		}

		$scope.registerUser = function(user, next) {
			$http.post( '/user/register', angular.toJson( user ) )
				.success( function( data ) {
					$http.post('/user/login/', angular.toJson( user ) )
						.success( function( data ) {
							next();
						});
				})
				.error( function( data ) {
					next(data.errorDetails || 'Could not register user');
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
}]);

app.config( function( $routeProvider, $httpProvider, $provide ) {

	$provide.decorator( '$rootScope', [ '$delegate' , function( $delegate ) {

		Object.defineProperty( $delegate.constructor.prototype, '$onRootScope', {
			value: function( name, listener ){
				var unsubscribe = $delegate.$on( name, listener );
				this.$on( '$destroy', unsubscribe );
			},
			enumerable: false
		});

		return $delegate;
	}]);

	var isLoggedIn = [ '$q', '$http', '$timeout', '$rootScope', 'userService',
		function( $q, $http, $timeout, $rootScope, userService ) {
			var deferred = $q.defer();

			$http.get( '/user' )
				.success(function(data) {
					if (data.user) {
						userService.setUser(data.user);
						deferred.resolve(data.user);
						$rootScope.updateNotificationOffset();
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
		.when('/', { templateUrl:'pages/project-space.html', controller: projectSpaceController,
					resolve: { user: isLoggedIn }
					})
		.when('/project', { templateUrl:'pages/project.html', controller: projectController,
							resolve: { user: isLoggedIn }
							})
		.when('/error', { templateUrl:'pages/error.html' })
		.otherwise({ redirectTo:'/' });
});

app.service('projectsService', function( $http, $q ) {
	var projects = [];
	return {
		getList: function( user ) {
			projects = [];

			$http.get('/project/list')
				.success( function( data ) {
					angular.forEach(data.projects, function( project ) {
						projects.push( project );
					})
				});

			return projects;
		},
		getProject: function( projectId ) {
			var deferred = $q.defer();

			$http.get( '/project/' + projectId )
				.success( function( data ) {
					deferred.resolve( data.project );
				})

			return deferred.promise;
		}
	}
})

app.service('userService', function( $rootScope, $http ) {
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
			$http.put( '/user', angular.toJson(user) )
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

app.directive('onClickChangeText', function( $timeout, $parse ) {
	return {
		link: function( scope, element, attrs ) {
			element.bind('focus', function() {
				if ( attrs.id === 'reg-name' ) {
					scope.registrationText = 'Type in your name...';
				}
				if ( attrs.id === 'reg-email' ) {
					scope.registrationText = 'Now your email. You can verify it shortly...';
				}
				if ( attrs.id === 'reg-password' ) {
					scope.registrationText = 'Nice. Now choose a good password.';
				}

				scope.$digest();
			});
		}
	};
});

app.directive('focusOn', function( $timeout, $parse ) {
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

app.directive('onEnter', function() {
	return function( scope, element, attrs ) {
		element.bind("keydown keypress", function( event ) {
			if(event.which === 13) {
				scope.$apply(function(){
				scope.$eval(attrs.onEnter, {'event': event});
			});
				event.preventDefault();
			}
		});
	};
});

app.directive('ckEditor', function( $window, $rootScope, $timeout ) {
	return {
		require: '?ngModel',
		link: function(scope, elm, attr, ngModel) {
			var ck = CKEDITOR.replace('bodyeditor', {
				allowedContent: true,
				skin: 'scripler',
				resize_enabled: false,
				extraPlugins: 'scripler,floating-tools,lineHeight,texttransform,indent-right,indentations,scripler_pagebreak,imageScripler,linkScripler',
				floatingtools: 'Basic',
				floatingtools_Basic: [
					{ name: 'styles', items: [ 'Font' ] },
					'/',
					{ name: 'format', items: [ 'Format' ] },
					'/',
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
				height: $window.innerHeight - 90,
				width: '100%',
				language: 'en',
				//Change to standard font we want to start all projects with :)
				contentsCss: ['ckeditor/contents.css', 'stylesets/non-editable.css'],
				//Load css sheet via angualr here
				toolbar: [
					['Undo'], ['Redo'], ['Bold'], ['Italic'], ['Underline'], ['Strike'], ['JustifyLeft'], ['JustifyCenter'], ['JustifyRight'], ['JustifyBlock'], ['NumberedList'], ['BulletedList'], ['imageScripler'], ['linkScripler']
				],
				removeButtons: 'language,CreateDiv,Flash,Iframe'
			});

			if (!ngModel) return;

			$rootScope.modelTimeout = null;
			function timeOutModel( event ) {
				if ( event.name === 'dataReady' ) {
					$rootScope.$emit('ckDocument:dataReady');
				}
				if ( event ) {
					if ( event.data ) {
						if ( event.data.keyCode !== 13 ) {
							if ( $rootScope.modelTimeout ) {
								$timeout.cancel( $rootScope.modelTimeout );
							}
							$rootScope.modelTimeout = $timeout( updateModel, 1000 );
						}
					}
				}
			}

			function updateModel() {
				if ( !scope.$$phase ) {
					scope.$apply(function() {
						ngModel.$setViewValue(ck.getData());
					});
				}
			}

			ck.on('paste', function( event ) {
				//TODO check for pasted value vs copiedElement
				if ( scope.copiedElement ) {
					event.stop();

					var el = scope.copiedElement.clone( true );
					var headingsArray = [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ];

					if ( headingsArray.indexOf( el.getName() ) > -1 ) {
						el.$.id = 'id_' + Date.now();
					}

					if ( el.$.children.length > 0 ) {
						for ( var i = 0; i < el.$.children.length; i++ ) {
							var child = el.$.children[i];

							if ( child.tagName === 'A' ) {
								if ( child.hasAttribute( 'name' ) && child.hasAttribute( 'title' ) ) {
									child.remove();
								}
							}

							if ( child.tagName === 'IMG' ) {
								if ( child.hasAttribute( 'class' ) ) {
									if ( child.getAttribute( 'class' ) === 'cke_anchor' ) {
										child.remove();
									}
								}
							}

							try {
								if ( headingsArray.indexOf( child.nodeName.toLowerCase() ) > -1 ) {
									child.id = Date.now() + i;
								}
							} catch ( e ) {
								//anchor does not have getName method
							}
						}
					}

					ck.insertElement( el );
				}
			});
			ck.on('key', function( event ) { timeOutModel( event ); });
			ck.on('dataReady', function( event ) { $rootScope.$emit('ckDocument:dataReady'); timeOutModel( event ); });
			/*ck.on('save', function() {
				ngModel.$setViewValue(ck.getData());
			});*/

			ngModel.$render = function(value) {
				ck.setData(ngModel.$viewValue);
				$rootScope.$emit('ckDocument:renderFinished');
			};

			if ( CKEDITOR.env.ie && CKEDITOR.env.version < 9 ) {
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
