'use strict'

function projectController( $scope, $location, userService, projectsService, $http, $upload, ngProgress, $timeout ) {

	var timeout = null;

	var lastSavedDocumentLength = 0;

	var documentWatch = false;

	var secondsToWait = 5;

	$scope.updateUser = function() {
		userService.updateUser( $scope.user );
	}

	$scope.onFileSelect = function($files) {
		for (var i = 0; i < $files.length; i++) {
			var file = $files[i];
			ngProgress.start();
			$scope.upload = $upload.upload({
				url: '/document/' + $scope.pid + '/upload',
				file: file
			}).progress(function(evt) {
				ngProgress.set(parseInt(100.0 * evt.loaded / evt.total) - 25);
				console.log('percent: ' + parseInt(100.0 * evt.loaded / evt.total));
			}).success(function(data, status, headers, config) {
				ngProgress.complete();
				$scope.projectDocuments.push(data.document);
				console.log(data);
			});
		}
	};

	$scope.sortable_option = {
		stop : function( list, drop_item ) {
			var documentList = {};
			documentList.documents = list;

			if ( $scope.user._id ) {
				$http.put('/document/' + $scope.pid + '/rearrange', angular.toJson( documentList ) )
					.success( function() {});
			} else {
				//save to localstorage
			}
		}
	};

	// Scope, Project
	$scope.projectDocuments = [
		//ADD/FIX: Get Publications API Call, on success do change
		{_id:'00001',name:'Document 1',text:'<h1>this is a test</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'bookbw'},
		{_id:'00002',name:'Document 2',text:'<h1>this is a test 2</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'bookbw'},
		{_id:'00003',name:'Document 3',text:'<h1>this is a test 3</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'futurebw'},
		{_id:'00004',name:'Document 4',text:'<h1>this is a test 4</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'futurebw'},
		{_id:'00005',name:'Document 5',text:'<h1>this is a test 5</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'pleasantbw'},
		{_id:'00006',name:'Document 6',text:'<h1>this is a test 6</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'pleasantbw'},
		{_id:'00007',name:'Document 7',text:'<h1>this is a test 7</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'bookbw'},
		{_id:'00008',name:'Document 8',text:'<h1>this is a test 8</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'bookbw'}
	];

	$scope.$on('user:updated', function( event, user ) {
		$scope.user = user;
		$scope.pid = ($location.search()).pid;

		var projectPromise = projectsService.getProject( $scope.pid );
		projectPromise.then( function( project ) {
			$scope.project = project;
			$scope.projectDocuments = $scope.project.documents;
		});
	});

	$scope.openProjectDocument = function( projectDocument ) {
		if ( $scope.documentSelected._id ) {
			$scope.updateProjectDocument();
		}

		$http.get('/document/' + projectDocument._id)
			.success( function( data ) {
				var index = $scope.projectDocuments.indexOf( projectDocument );
				$scope.projectDocuments[index] = data.document;
				$scope.documentSelected = data.document;
				lastSavedDocumentLength = data.document.text.length;

				if ( !documentWatch ) {
					$scope.$watch('documentSelected', saveProjectDocumentUpdates, true);
					documentWatch = true;
				}
			})
	}

	$scope.addProjectDocument = function() {
		var order = $scope.projectDocuments.length + 1;
		var name = "Document " + order;
		var document = {};
		document.name = name;
		document.text = '';

		if ( $scope.user._id ) {
			document.projectId = $scope.pid;
			$http.post('/document', angular.toJson( document ) )
				.success( function( data ) {
					$scope.projectDocuments.push( data.document );
				})
		} else {
			document._id = Date.now();
			$scope.projectDocuments.push( document );
		}
	}

	$scope.updateProjectDocument = function() {
		var document = $scope.documentSelected;
		lastSavedDocumentLength = document.text.length;
		if ( $scope.user._id ) {
			$http.put(/document/ + document._id + '/update', angular.toJson( document ))
				.success( function() {
					//TODO inform user that document is saved
				});
		} else {
			//TODO save to localstorage
		}
	};

	$scope.archiveProjectDocument = function( projectDocument ) {
		if ( $scope.user._id ) {
			$http.put('/document/' + projectDocument._id + '/archive')
				.success( function() {
					projectDocument.archived = true;
				});
		} else {
			projectDocument.archived = true;
		}
	};

	$scope.renameProjectDocument = function( projectDocument ) {
		if ( $scope.user._id ) {
			$http.put('/document/' + projectDocument._id + '/rename', angular.toJson( projectDocument ) )
				.success( function() {});
		} else {
			//TODO save to localstorage
		}
	};

	var saveProjectDocumentUpdates = function( newVal, oldVal ) {
		if ( newVal != oldVal ) {
			var charsDiff = 0;

			charsDiff = newVal.text.length - lastSavedDocumentLength;

			if ( charsDiff > 30 ) {
				if ( timeout ) {
					$timeout.cancel( timeout );
				}
				$scope.updateProjectDocument();
			}
			if ( timeout ) {
				$timeout.cancel( timeout )
			}
			timeout = $timeout( $scope.updateProjectDocument, secondsToWait * 1000 );
		}
	};

    function initiateEditor(scope) {
    	$scope.ckContent = 'test';

//		var startChapter = $scope.documents[0];
//		$scope.entrybody = startChapter.content;
		// Mangler at tilføje stylen startChapter.documentstyleSheet
    }

    initiateEditor();

	angular.element(document).ready(function () {



		//editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+startChapter.documentstyleSheet+'.css';

//	    var startChapter = $scope.documents[0];
//	    $scope.entrybody = startChapter.content;
	    // Mangler at tilføje stylen startChapter.documentstyleSheet
		//editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+startChapter.documentstyleSheet+'.css';

		// CK Editor Controls
		$scope.projectDocumentChosen = function( projectDocument ) {
			$scope.openProjectDocument( projectDocument );

			//$scope.ckEditorContent = projectDocument.styleSheet;
			//Change to use the script settings and load content there
			//editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+projectDocument.styleSheet+'.css';
		};

	    $scope.changeStyle = function (name) {
			if (editor) {
				editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+name+'.css';
			}
			else {
				console.log('error: no editor found')
			}
	    };

	});
}
