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

function PublicationsCtrl($scope) {
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


    $scope.toggleElement = function(element) {
      if ($scope.element != true && $scope.element != false) {
          $scope.element = true;
      }

      $scope.element = $scope.element === false ? true: false;

    };

    $scope.addPublication = function () {
      //ADD/FIX: Create API Call, on success do change
       $scope.publications.push({publicationNumber:'00000',publicationName:'Titel Blank',publicationCreated:Date.now(),publicationChanged:Date.now()});
    };

    $scope.removePublication = function (publication) {
      //ADD/FIX: Removing API Call, on success do change
      var removePublication = confirm('Positive you want to delete Publication');
      if (removePublication === true) {
        $scope.publications.splice($scope.publications.indexOf(publication), 1);
      }
    };

    $scope.archivePublication = function (publication) {
      //ADD/FIX: Archive API Call, on success do change
      //CHANGE/FIX: When archieving, dont remove from view, just dim it and change the options to only activate it, at reload it should not be there
      $scope.publications.splice($scope.publications.indexOf(publication), 1);
    };

    $scope.renamePublication = function (publication) {
      //ADD/FIX: Renaming API Call, on success do change
      publication.publicationChanged = Date.now();
    };

    $scope.copyPublication = function (publication) {
      //ADD/FIX: Copy API Call, on success do change
      //CHANGE/FIX: Get Number/ID from callback on succes from DB
      var copiedPublication = angular.copy(publication);
      var copiedPublicationNumber = copiedPublication.publicationNumber;
      var copiedPublicationName = copiedPublication.publicationName;

      $scope.publications.push({publicationNumber:'C'+copiedPublicationNumber,publicationName:'copy of '+copiedPublicationName,publicationCreated:Date.now(),publicationChanged:Date.now()});
    };

};

angular.module('angularjs-publications', ['focusOn']);
angular.module('focusOn', []).directive('focusOn', function() {
    return {
        restrict: 'A',
        link:function (scope, element, attrs) {
            scope.$watch(attrs.focusOn, function(value){
                if(attrs.focusOn) {
                    window.setTimeout(function(){
                        //CHANGE/FIX: Uses Jquery lib, change as soon as availeble in Jquery Lite inside Angular
                        element.focus().select();
                    },10);
                }
            }, true);
        }
    };
});