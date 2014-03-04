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

function PublicationsCtrl ( $scope, $http, userService ) {
	$scope.publications = [];

	$scope.$on('demo:mode', function( event ) {
		$scope.publications = [ { _id: Date.now(), name:'Demo Title', order: 0 } ];
	});

	$scope.$on('user:updated', function( event, user ) {
		$scope.user = user;
		//iterate through publications and call add
	});

	$scope.publications = [
		{ id:'00001', name:'Demo Title 1', created:'1363359600', changed:'1365606000' }
	];

	if ( $scope.user._id ) {
		$http.get('/project/list')
			.success( function( data ) {
				$scope.publications = [];
				angular.forEach(data.projects, function( project ) {
					$scope.publications.push( {id: project._id, name: project.name, created: project.created, changed: project.modified} );
				})
		});
	}

	$scope.toggleElement = function( element ) {
		if ($scope.element != true && $scope.element != false) {
			$scope.element = true;
		}

		$scope.element = $scope.element === false ? true: false;

	};

	$scope.addPublication = function() {
		var index = $scope.publications.length + 1;
		var name = "Title " + index;
		var data = {};
		data.name = name;

		$http.post('/project', angular.toJson( data ) )
			.success( function( data ) {
				var project = data.project;
				$scope.publications.push( {id: project._id, name: project.name, created: project.created, changed: project.modified} );
			});
	};

	$scope.archivePublication = function( publication ) {
		$http.put('/project/' + publication.id + '/archive')
			.success( function() {
				$scope.publications.splice($scope.publications.indexOf(publication), 1);
			});
	};

	$scope.renamePublication = function( publication ) {
		var data = {};
		data.name = publication.name;
		$http.put('/project/' + publication.id + '/rename', angular.toJson( data ) )
			.success( function() {});
	};

	$scope.copyPublication = function( publication ) {
		$http.post('/project/' + publication.id + '/copy')
			.success( function( data ) {
				var project = data.project;
				$scope.publications.push( {id: project._id, name: project.name, created: project.created, changed: project.modified} );
			});
	};

};
