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

function PublicationsCtrl ( $scope, $http ) {
	
	$scope.publications = [
		//TODO remove when not in use anymore for testing
		{id:'00001',name:'Titel 1',created:'1363359600',changed:'1365606000'},
		{id:'00002',name:'Titel 2',created:'1368637200',changed:'1365606000'},
		{id:'00003',name:'Titel 3',created:'1363359600',changed:'1382281200'},
		{id:'00004',name:'Titel 4',created:'1368637200',changed:'1382281200'},
		{id:'00005',name:'Titel 5',created:'1363359600',changed:'1365606000'},
		{id:'00006',name:'Titel 6',created:'1368637200',changed:'1365606000'},
		{id:'00007',name:'Titel 7',created:'1363359600',changed:'1382281200'},
		{id:'00008',name:'Titel 8',created:'1368637200',changed:'1382281200'}
	];

	$http.get('/project/list').success( function ( data ) {
		$scope.publications = [];
		angular.forEach(data.projects, function ( project ) {
			$scope.publications.push( {id: project._id, name: project.name, changed: project.modified} );
		})
	});


	$scope.toggleElement = function (element) {
	  if ($scope.element != true && $scope.element != false) {
		  $scope.element = true;
	  }

	  $scope.element = $scope.element === false ? true: false;

	};

	$scope.addPublication = function () {
		var index = $scope.publications.length + 1;
		var name = "Title " + index;
		var data = '{"name": "' + name + '"}';
		
		$http.post('/project', data).success( function( data ) {
			var project = data.project;
			$scope.publications.push( {id: project._id, name: project.name, changed: project.modified} );
		});
	};

	$scope.archivePublication = function ( publication ) {
		$http.put('/project/' + publication.id + '/archive')
			.success( function () {
				$scope.publications.splice($scope.publications.indexOf(publication), 1);
			});
	};

	$scope.renamePublication = function ( publication ) {
		var data = '{"name": "' + publication.name + '"}';
		$http.put('/project/' + publication.id + '/rename', data)
			.success( function () {});
	};

	$scope.copyPublication = function (publication) {
		$http.post('/project/' + publication.id + '/copy')
	  		.success( function ( data ) {
	  			var project = data.project;
				$scope.publications.push( {id: project._id, name: project.name, changed: project.modified} );	
	  		});
	};

};