'use strict'

function createController($scope) {

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

function PublicationsCtrl ( $scope, $http, userService, localStorageService ) {
	$scope.publications = [];
	var lsName = 'demo-scripler-publications';

	$scope.$on('demo:mode', function( event, publications ) {
		$scope.publications = publications;
	});

	$scope.$on('user:updated', function( event, user ) {
		$scope.user = user;

		if ( user._id ) {
			angular.forEach($scope.publications, function( publication, index ) {
				$http.post('/project', angular.toJson( publication ) )
					.success( function( data ) {
						$scope.publications[index] = data.project;
				});
			})
			$scope.getList();
			localStorageService.remove( lsName );
		}
	});

	$scope.getList = function() {
		$http.get('/project/list')
			.success( function( data ) {
				$scope.publications = [];
				angular.forEach(data.projects, function( project ) {
					$scope.publications.push( project );
				})
		});
	};

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
		publication.order = order;

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
		var index = publications.indexOf( publication );
		if ( $scope.user._id ) {
			$http.put('/project/' + publication._id + '/archive')
				.success( function() {
					publication.archived = true;
					publications[index] = publication;
				});
		} else {
			publication.archived = true;
			publications[index] = publication;
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
		//backend needs to support order for copying, because otherwise order is 0
		if ( $scope.user._id ) {
			$http.post('/project/' + publication._id + '/copy')
				.success( function( data ) {
					$scope.publications.push( data.project );
				});
		} else {
			var publication = publication;
			this.publication.name = publication.name + ' - Copy';
			$scope.publications.push( this.publication );
			localStorageService.add( lsName, $scope.publications );
		}
	};

};
