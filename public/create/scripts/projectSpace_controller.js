'use strict'

function projectSpaceController($scope, $http, projectsService, userService, $q, user, $location, utilsService) {
	$scope.user = user;
	$scope.showProjectOptions = false;
	$scope.frontpage = $location.host();
	if ( $scope.user != undefined ) {
		$scope.projects = projectsService.getList( $scope.user );
	}

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
			user.password = $scope.newPassword;
			user.passwordOld = $scope.password;
			$http.put( '/user', angular.toJson( user ) )
				.success( function( data ) {
					$scope.editPassword = !$scope.editPassword;
				})
				.error( function( data ) {
					$scope.editPasswordForm.currentPassword.$invalid = true;
				});
		}
	}

	$scope.openFeedback = function() {
		userService.openFeedback( $scope.user );
	}

	$scope.updateUser = function() {
		$scope.saveSubmitted = true;

		if ( $scope.emailEditForm.$valid ) {
			userService.updateUser( $scope.user );
			$scope.showSettings = false;
		}
	}

	$scope.$onRootScope('user:registered', function( event, user ) {
		if ( user._id ) {
			$scope.user = user;
			userService.setUser(user);
		}
	});

	$scope.toggleElement = function( element ) {
		if ($scope.element != true && $scope.element != false) {
			$scope.element = true;
		}

		$scope.element = $scope.element === false ? true: false;

	};

	$scope.addProject = function() {
		var order = null;
		if ($scope.projects) {
			order = $scope.projects.length + 1;
		} else {
			$scope.projects = [];
			order = 1;
		}

		var name = "Untitled " + order;
		var project = {};
		project.name = name;

		if ( $scope.user || $scope.demoUser ) {
			var firstname = null;
			var lastname = null;
			var user = $scope.user ? $scope.user : $scope.demoUser;
			// Before registering name is stored in "user.name"
			if (user.name) {
				var nameParts = utilsService.getNameParts(user.name);
				firstname = nameParts.firstname;
				lastname = nameParts.lastname;
			} else {
				firstname = user.firstname;
				lastname = user.lastname;
			}

			$http.post('/project', angular.toJson( project ) )
				.success( function( data ) {
					$http.put('/project/' + data.project._id + '/metadata', {
						'title': name,
						'authors': firstname + ' ' + lastname,
						'language': null,
						'description': null,
						'isbn': null
					}).success( function() {
							$scope.projects.push( data.project );
					});
				});
		} else {
			console.log("ERROR adding project: this should not have happened: either a real user or a demo user should exist.");
		}
	};

	$scope.archiveProject = function( project ) {
		if ( $scope.user || $scope.demoUser ) {
			$http.put('/project/' + project._id + '/archive')
				.success( function() {
					project.archived = true;
				});
		} else {
			console.log("ERROR archiving project: this should not have happened: either a real user or a demo user should exist.");
		}
	};

	$scope.unarchiveProject = function( project ) {
		if ( $scope.user || $scope.demoUser ) {
			$http.put('/project/' + project._id + '/unarchive')
				.success( function() {
					project.archived = false;
				});
		} else {
			console.log("ERROR unarchiving: this should not have happened: either a real user or a demo user should exist.");
		}
	};

	$scope.renameProject = function( project ) {
		if ( $scope.user || $scope.demoUser ) {
			$http.put('/project/' + project._id + '/rename', angular.toJson( project ) )
				.success( function() {});
		} else {
			console.log("ERROR renaming project: this should not have happened: either a real user or a demo user should exist.");
		}
	};

	$scope.copyProject = function( project ) {
		if ( $scope.user || $scope.demoUser ) {
			$http.post('/project/' + project._id + '/copy')
				.success( function( data ) {
					$scope.projects.push( data.project );
				});
		} else {
			console.log("ERROR copying project: this should not have happened: either a real user or a demo user should exist.");
		}
	};

};
