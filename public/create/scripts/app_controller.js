'use strict';

var app = angular.module( 'scriplerApp', [ 'ngRoute', 'ngSanitize', 'LocalStorageModule', 'html5.sortable', 'angularFileUpload',
										 	'ngProgress'] );

app.controller( 'appController', [ '$http', '$scope', 'userService', 'localStorageService', '$rootScope', '$timeout',
	function( $http, $scope, userService, localStorageService, $rootScope, $timeout ) {
		$scope.errors = {};
		$scope.errors.name = 'Name is empty';
		$scope.errors.email = 'Email is invalid';
		$scope.errors.password = '6 Characters minimum';
		$scope.registrationText = 'Hey Stranger - register to save your work!';
		$scope.EMAIL_REGEXP = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

		$scope.user = {};

		$scope.$onRootScope('user:updated', function( event, user ) {
			$scope.user = user;
			if (!$scope.user.emailValidated) {
				$scope.registrationText = 'Hey there, remember to validate your email-address. Learn more.';
			}
		});

		$scope.$onRootScope('login:failed', function( event ) {
			var publications = [];
			var lsName = 'demo-scripler-publications';
			var lsPublications = localStorageService.get( lsName );
				if ( lsPublications ) {
					if ( lsPublications.length !== 0 ) {
						publications = lsPublications;
					}
				} else {
					publications = [ { _id: Date.now(), name:'Demo Title' } ];
					localStorageService.add( lsName, publications );
				}
			var demoOn = function() {
				$rootScope.$emit('demo:mode', publications);
			}
			$timeout(demoOn, 100); //!important: timeout for createController to load
		});

		$scope.submitRegistration = function() {
			$scope.registrationSubmitted = true;
			$scope.registerForm.$pristine = false;
			$scope.registerForm.name.$pristine = false;
			$scope.registerForm.email.$pristine = false;
			$scope.registerForm.password.$pristine = false;

			if ($scope.registerForm.$valid) {
				$http.post( '/user/register', angular.toJson( $scope.user ) )
					.success( function( data ) {
						if ( data.user ) {
							$http.post('/user/login/', angular.toJson( $scope.user ) )
								.success( function( data ) {
									if ( data.user ) {
										$rootScope.$emit('user:registered', data.user);
										$scope.registrationText = 'Great! We\'ve emailed you a confirmation link (learn more). You can keep writing though...';
									}
								});
						}
					})
					.error( function( data ) {
						if ( data.errorDetails ) {
							if ( data.errorDetails === 'Email already registered' ) {
								$scope.errors.email = data.errorDetails;
								$scope.registerForm.email.$invalid = true;
								$scope.registerForm.$invalid = true;
							}
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
				.success( function( data ) {
					if ( data.user ) {
						userService.setUser( data.user );
						$timeout(deferred.resolve, 0);
					}
				})
				.error( function( data ) {
					$rootScope.$emit('login:failed');
					$timeout(deferred.resolve, 0);
				});
	}]

	$routeProvider
		.when('/', { templateUrl:'pages/create.html', controller: createController,
					resolve: { access: isLoggedIn }
					})
		.when('/project', { templateUrl:'pages/project.html', controller: projectController,
							resolve: { access: isLoggedIn }
							})
		.when('/error', { templateUrl:'pages/error.html', controller: createController })
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

					if ( user.showArchived ) {
						$http.get('/project/archived')
							.success( function( data ) {
								angular.forEach(data.projects, function( project ) {
									projects.push( project );
								})
							});
					}
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
		setUser: function( user ) {
			this.user = user;
			$rootScope.$emit('user:updated', this.user);
		},
		getUser: function() {
			return this.user;
		},
		updateUser: function( user ) {
			var self = this;
			$http.put( '/user', angular.toJson( user ) )
				.success( function( data ) {
					self.setUser( data.user );
				});
		}
	};
});

app.directive('onClickChangeText', function( $timeout, $parse ) {
	return {
		link: function( scope, element, attrs ) {
			element.bind('focus', function() {
				if ( attrs.id === 'reg-name' ) {
					scope.registrationText = 'Just put in your name ...';
				}
				if ( attrs.id === 'reg-email' ) {
					scope.registrationText = 'Good job, now your email. We\'ll verify it shortly ...';
				}
				if ( attrs.id === 'reg-password' ) {
					scope.registrationText = 'Nice. Now choose a password, a good one.';
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

app.directive('ckEditor', function() {
	return {
		require: '?ngModel',
		link: function(scope, elm, attr, ngModel) {
			var ck = CKEDITOR.replace('bodyeditor', {
				allowedContent: true,
				skin: 'scripler',
				resize_enabled: false,
				//extraPlugins: 'scripler',
				height: 600,
				width: 800,
				font_names:'serif;sans serif;monospace;cursive;fantasy;Ribeye',
				//contentsCss: ['stylesets/pleasantbw.css', 'contents.css', 'http://fonts.googleapis.com/css?family=Ribeye'],
				//Change to standard font we want to start all projects with :)
				contentsCss: ['stylesets/pleasantbw.css'],
				//Load css sheet via angualr here
				toolbar: [
					//['Source'], ['Undo'], ['Redo'], ['Paste'], ['PasteFromWord'], ['Styles'], ['Bold'], ['Italic'], ['Underline'], ['Strike'], ['JustifyLeft'], ['JustifyCenter'], ['JustifyRight'], ['JustifyBlock'], ['NumberedList'], ['BulletedList'], ['Image'], ['Link'], ['TextColor'], ['BGColor']
					['Undo'], ['Redo'], ['Styles'], ['Bold'], ['Italic'], ['Underline'], ['Strike'], ['JustifyLeft'], ['JustifyCenter'], ['JustifyRight'], ['JustifyBlock'], ['NumberedList'], ['BulletedList'], ['Image'], ['Link'], ['TextColor'], ['BGColor']
				],
				removeButtons: 'language,CreateDiv,Flash,Iframe'
			});

			if (!ngModel) return;

			ck.on('instanceReady', function() {
				ck.setData(ngModel.$viewValue);
			});

			function updateModel() {
				scope.$apply(function() {
					ngModel.$setViewValue(ck.getData());
				});
			}

			ck.on('change', updateModel);
			ck.on('key', updateModel);
			ck.on('dataReady', updateModel);

			ngModel.$render = function(value) {
				ck.setData(ngModel.$viewValue);
			};

			if ( CKEDITOR.env.ie && CKEDITOR.env.version < 9 )
			CKEDITOR.tools.enableHtml5Elements( document );

		}
	};
});
