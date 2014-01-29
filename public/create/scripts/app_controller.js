'use strict';

var appSite = angular.module( 'scriplerApp', [] );

appSite.controller( 'appController', [ '$http', '$scope', function( $http, $scope ) {

}]);

appSite.config( function ( $routeProvider, $locationProvider, $httpProvider ) {

	var isLoggedIn = [ '$q', '$timeout', '$http', '$location', function ( $q, $timeout, $http, $location ) {
		var deferred = $q.defer();

		$http.get( 'http://localhost:3000/user' )
			.success( function( userInfo ){
				if ( userInfo.user ) {
					$timeout( deferred.resolve, 0 );
				} else {
					$timeout( function() {
						deferred.reject();
					}, 0);
					location.href = 'http://localhost:8888/public/#login';
				}
			});

		return deferred.promise;
	}]

	$httpProvider.responseInterceptors
		.push( function ( $q, $location ) {
			return function(promise) {
				return promise
				.then(
					function(response){
						return response;
					},
					function(response) {
						if (response.status === 401) {
							location.href = 'http://localhost:8888/public/#login';
						}
						return $q.reject(response);
					}
				);
			}
		});

	$routeProvider
		.when('/', { templateUrl:'pages/create.html', controller:createController,
					resolve: { access: isLoggedIn }
					})
		.when('/create', { templateUrl:'pages/create.html', controller:createController })
		.when('/project', { templateUrl:'pages/project.html', controller:projectController })
		.when('/login', { templateUrl:'pages/login.html' })
		.when('/error', { templateUrl:'pages/error.html', controller:createController })
		.otherwise({ redirectTo:'/' });
});

appSite.directive('ckEditor', function() {
	return {
		require: '?ngModel',
		link: function(scope, elm, attr, ngModel) {
			var ck = CKEDITOR.replace('bodyeditor', {
				allowedContent: true,
				skin: 'scripler',
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

/*			if (!ngModel) return;

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

/*					if ( CKEDITOR.env.ie && CKEDITOR.env.version < 9 )
			CKEDITOR.tools.enableHtml5Elements( document );*/

		}
	};
});
