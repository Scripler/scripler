'use strict'

function createController($scope, $http, projectsService, userService, $q, user, $location, utilsService) {

	// TODO: is this the best location for a "constant" like this?
	$scope.upgradeText = {
		'free': 'Free subscription',
		'premium': 'Premium subscription'
	};

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

	$scope.updateUser = function() {
		$scope.saveSubmitted = true;

		if ( $scope.emailEditForm.$valid ) {
			userService.updateUser( $scope.user );
			$scope.showSettings = false;
		}
	}
	$scope.cancelUpdateUser = function() {
		$scope.showSettings = false;
		$scope.editPassword = false;
	}
	$scope.cancelUpdatePassword = function() {
		$scope.showSettings = true;
		$scope.editPassword = false;
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
		// Ensure function does nothing if the user is not allowed to create a project
		// (the backend also checks this, so this is just to avoid calling the backend)
		var canCreateProject = utilsService.canCreateProject($scope.user.level, $scope.projects);
		if (!canCreateProject) return;

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
						data.project.editingProjectTitle = true;
						$scope.projects.push( data.project );
					});
				});
		} else {
			console.log("ERROR adding project: this should not have happened: either a real user or a demo user should exist.");
		}
	};

	$scope.selectedProjectOptions = -1;
	$scope.showProjectOptions = function (index) {
		if (index != $scope.selectedProjectOptions) {
			$scope.selectedProjectOptions  = index;
		}
		else {
			$scope.hideProjectOptions();
		}
	};

	$scope.hideProjectOptions = function () {
		$scope.selectedProjectOptions = -1;
	};

	$scope.selectedProjectHover = -1;
    $scope.showProjectTitle = function(index, status) {
		if (!status) {
	        $scope.selectedProjectHover = index;
		}
    };

    $scope.hideProjectTitle = function() {
        $scope.selectedProjectHover = -1;
    };

	$scope.getNewProjectClass = function() {
		var canCreateProject = utilsService.canCreateProject(user.level, $scope.projects);
		var newProjectClass = canCreateProject ? 'project new' : 'project upgrade';
		return newProjectClass;
	};

	$scope.canLoadProject = function(project) {
		// TODO: is there a more elegant way to get a specific object attribute from an array of objects?
		var projectIds = [];
		for (var i=0; i<$scope.projects.length; i++) {
			projectIds[i] = $scope.projects[i]._id;
		}
		return utilsService.canLoadProject(user.level, projectIds, project._id);
	};

	$scope.archiveProject = function(project) {
		if ( $scope.user || $scope.demoUser ) {
			$http.put('/project/' + project._id + '/archive')
				.success( function() {
					project.archived = true;
				});
		} else {
			console.log("ERROR archiving project: this should not have happened: either a real user or a demo user should exist.");
		}
	};

	$scope.deleteProject = function(project, index) {
		if ( $scope.user || $scope.demoUser ) {
			var deleteEbook = confirm("Are you sure? This cannot be undone!");
			if (deleteEbook == true) {
				$http.delete('/project/' + project._id)
					.success( function() {
						$scope.projects.splice(index, 1);
					});
			}
		} else {
			console.log("ERROR deleting project: this should not have happened: either a real user or a demo user should exist.");
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

	$scope.storeTitle = function(project){
		$scope.projectStoredName = project.name;
	}

	$scope.renameProject = function( project ) {
		if (project.name===undefined){
			project.name = $scope.projectStoredName;
		}
		if ( $scope.user || $scope.demoUser ) {
			$http.put('/project/' + project._id + '/rename', angular.toJson( project ) )
				.success( function() {
					$http.put('/project/' + project._id + '/metadata', {
						'title': project.name,
						'authors': project.metadata.authors,
						'language': project.metadata.language,
						'description': project.metadata.description,
						'isbn': project.metadata.isbn
					}).success( function() {
					});
				});
		} else {
			console.log("ERROR renaming project: this should not have happened: either a real user or a demo user should exist.");
		}
	};
};
