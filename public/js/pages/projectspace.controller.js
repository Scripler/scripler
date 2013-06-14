function PublicationsCtrl($scope) {
    $scope.publications = [
        //ADD/FIX: Get Publications API Call, on success do change
        {publicationNumber:'00001',publicationName:'Titel 1',publicationCreated:'1363359600',publicationChanged:'1365606000'},
        {publicationNumber:'00002',publicationName:'Titel 2',publicationCreated:'1368637200',publicationChanged:'1365606000'},
        {publicationNumber:'00003',publicationName:'Titel 3',publicationCreated:'1363359600',publicationChanged:'1382281200'},
        {publicationNumber:'00004',publicationName:'Titel 4',publicationCreated:'1368637200',publicationChanged:'1382281200'},
        {publicationNumber:'00005',publicationName:'Titel 5',publicationCreated:'1363359600',publicationChanged:'1365606000'},
        {publicationNumber:'00006',publicationName:'Titel 6',publicationCreated:'1368637200',publicationChanged:'1365606000'},
        {publicationNumber:'00007',publicationName:'Titel 7',publicationCreated:'1363359600',publicationChanged:'1382281200'},
        {publicationNumber:'00008',publicationName:'Titel 8',publicationCreated:'1368637200',publicationChanged:'1382281200'}
    ];

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