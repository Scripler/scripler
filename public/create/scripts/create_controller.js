'use strict'

function createController( $scope, $http, userService ) {

		$scope.changePassword = function() {
			$scope.passwordSubmitted = true;

			if ( $scope.newPassword !== $scope.newPasswordRetype ) {
				$scope.editPasswordForm.$valid = false;
				$scope.editPasswordForm.newPassword.$invalid = true;
				$scope.editPasswordForm.newPasswordRetype.$invalid = true;
			}

			if ( $scope.editPasswordForm.$valid ) {
				var user = {};
				user.email = $scope.user.email;
				user.password = $scope.password;

				$http.post( '/user/login', angular.toJson( user ) )
					.success( function( data ) {
						user.password = $scope.newPassword;
						$http.put( '/user', angular.toJson( user ) )
							.success( function( data ) {
								$scope.editPassword = !$scope.editPassword;
							});
					})
					.error( function( data ) {
						$scope.editPasswordForm.currentPassword.$invalid = true;
					});
			}
		}

		$scope.updateUser = function() {
			$scope.saveSubmitted = true;

			if ( $scope.emailEditForm.$valid ) {
				$http.put( '/user', angular.toJson( $scope.user ) )
					.success( function( data ) {
						userService.setUser( data.user );
						$scope.showSettings = false;
					})
			}
		}

	/*$.ajax({
		url: 'http://scripler.com:3000/user/login',
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify({
			"email":"allan@scripler.com",
			"password":"askldjalskdjsa"
		}),
		dataType: 'json',
		success: function(data) {
		  console.dir(data);
		},
		error: function(jqxhr, status, errormsg) {
		  console.log("status: " + status + " errormsg: " + errormsg)
		}
	});*/

}
//}]);

function PublicationsCtrl ( $scope, $http, localStorageService, projectsService ) {
	$scope.publications = [];
	$scope.showPublicationOptions = false;
	var lsName = 'demo-scripler-publications';

	$scope.$on('demo:mode', function( event, publications ) {
		$scope.publications = publications;
	});

	$scope.$on('user:updated', function( event, user ) {
		$scope.user = user;
		$scope.publications = projectsService.getList( user );
	});

	$scope.$on('user:registered', function( event, user ) {
		if ( user._id ) {
			angular.forEach($scope.publications, function( publication, index ) {
				$http.post('/project', angular.toJson( publication ) )
					.success( function( data ) {
						$scope.publications[index] = data.project;
				});
			})
			localStorageService.remove( lsName );
			$scope.publications = projectsService.getList();
		}
	});

	$scope.toggleElement = function( element ) {
		if ($scope.element != true && $scope.element != false) {
			$scope.element = true;
		}

		$scope.element = $scope.element === false ? true: false;

	};

	$scope.addPublication = function() {
		var order = $scope.publications.length;
		var name = "Title " + order;
		var publication = {};
		publication.name = name;

		if ( $scope.user._id ) {
			$http.post('/project', angular.toJson( publication ) )
				.success( function( data ) {
					$scope.publications.push( data.project );
				});
		} else {
			publication._id = Date.now();
			$scope.publications.push( publication );
			localStorageService.add( lsName, $scope.publications );
		}
	};

	$scope.archivePublication = function( publication ) {
		var index = $scope.publications.indexOf( publication );
		if ( $scope.user._id ) {
			$http.put('/project/' + publication._id + '/archive')
				.success( function() {
					publication.archived = true;
				});
		} else {
			publication.archived = true;
			localStorageService.add( lsName, $scope.publications );
		}
	};

	$scope.renamePublication = function( publication ) {
		if ( $scope.user._id ) {
			$http.put('/project/' + publication._id + '/rename', angular.toJson( publication ) )
				.success( function() {});
		} else {
			localStorageService.add( lsName, $scope.publications );
		}
	};

	$scope.copyPublication = function( publication ) {
		if ( $scope.user._id ) {
			$http.post('/project/' + publication._id + '/copy')
				.success( function( data ) {
					$scope.publications.push( data.project );
				});
		} else {
			var copyPublication = {};
			copyPublication._id = Date.now();
			copyPublication.name = publication.name + ' - Copy';
			$scope.publications.push( copyPublication );
			localStorageService.add( lsName, $scope.publications );
		}
	};

};
