'use strict'

function projectController( $scope, $location, userService, projectsService, $http, $upload, ngProgress,
							$timeout, $rootScope, stylesetUtilsService, $q, user ) {

	var timeout = null;

	var lastSavedDocumentLength = 0;

	var documentWatch = false;

	var secondsToWait = 5;

	$scope.pid = ($location.search()).pid;

	$scope.user = user;

	$scope.projectDocuments = [];

	$scope.stylesets = [];

	if ( $scope.user === undefined ) {
		//demo mode
	} else {
		var projectPromise = projectsService.getProject( $scope.pid );

		projectPromise.then( function( project ) {
			$scope.project = project;
			$scope.projectDocuments = $scope.project.documents;

			if ( $scope.projectDocuments.length == 0 ) {
				$scope.addProjectDocument();
			} else {
				$scope.openProjectDocument( $scope.projectDocuments[0] );
			}
		});
	}

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
				$scope.projectDocuments.push( data.document );
				$scope.openProjectDocument( data.document );
				console.log(data);
			});
		}
	};

	$scope.sortable_option = {
		stop : function( list, drop_item ) {
			var data = {};
			var documentIds = [];

			angular.forEach(list, function( document ) {
				documentIds.push( document._id );
			})

			data.documents = listIds;

			if ( $scope.user._id ) {
				$http.put('/document/' + $scope.pid + '/rearrange', angular.toJson( data ) )
					.success( function() {});
			} else {
				//save to localstorage
			}
		}
	};

	$scope.openProjectDocument = function( projectDocument ) {

		if ( typeof $scope.documentSelected == 'object' ) {
			$scope.updateProjectDocument();
		}

		$http.get('/document/' + projectDocument._id)
			.success( function( data ) {
				var index = $scope.projectDocuments.indexOf( projectDocument );
				$scope.projectDocuments[index] = data.document;
				$scope.documentSelected = data.document;
				$scope.openStylesets( projectDocument );
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
					$scope.openProjectDocument( data.document );
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

	$scope.openStylesets = function( projectDocument ) {
		$http.get('/document/' + projectDocument._id + '/stylesets')
			.success( function( data ) {
				$scope.stylesets = data.stylesets;
			});
	}

	$scope.addNewStyleset = function() {
		var styleset = {};
		var length = $scope.stylesets.length;
		var number = length + 1;

		if ( length > 1 ) {
			var stylesetIndex = length - 1;
			var lastStyleset = $scope.stylesets[stylesetIndex];
			number = parseInt( lastStyleset.name.replace( /^\D+/g, '') );
			number = number + 1;
		}

		styleset.name = 'Styleset ' + number;

		$http.post('/styleset', angular.toJson( styleset ) )
			.success( function( data ) {
				$scope.stylesets.push( data.styleset );
			});
	}

	$scope.renameStyleset = function( styleset ) {
		$http.put('/styleset/' + styleset._id + '/update', angular.toJson( styleset ) );
	}

	$scope.archiveStyleset = function( styleset ) {
		$http.put('/styleset/' + styleset._id + '/archive')
			.success( function( data ) {
				styleset.archived = true;
			});
	}

	$scope.applyStylesetToProject = function( styleset ) {
		$http.put('/styleset/' + styleset._id + '/project/' + $scope.project._id)
			.success( function( data ) {
				$scope.project = data.project;
			});
	}

	$scope.applyStylesetToDocument = function( styleset ) {
		var deferred = $q.defer();

		var stylesetIndex = $scope.stylesets.indexOf( styleset );
		$http.put('/styleset/' + styleset._id + '/document/' + $scope.documentSelected._id)
			.success( function( data ) {
				if ( data.styleset ) {
					if ( data.styleset._id !== styleset._id ) {
						$scope.stylesets[stylesetIndex] = data.styleset;
					}
				}
				deferred.resolve( data.styleset );
			});

		return deferred.promise;
	}

	$scope.applyDefaultStyleset = function() {
		for ( var i = 0; i < $scope.stylesets.length; i++ ) {
			if ( $scope.documentSelected.defaultStyleset === $scope.stylesets[i]._id ) {
				$scope.applyStylesetToEditor( $scope.stylesets[i], true );
				break;
			}
		}
	}

	$scope.applyStylesetToEditor = function( styleset, isDefault ) {

		$scope.currentStylesetCSS = stylesetUtilsService.getStylesetContents( styleset, isDefault );

		$rootScope.ck.document.appendStyleText( $scope.currentStylesetCSS );
	}

	$scope.applyStyle = function( styleset, style ) {
		var styleIndex = styleset.styles.indexOf( style );

		var promise = $scope.applyStylesetToDocument( styleset );

		promise.then( function( styleset ) {
			//TODO apply style to ckEditor
		});
	}

	$scope.addNewStyle = function( styleset ) {
		var style = {};

		var length = styleset.styles.length;
		var number = length + 1;

		if ( length > 1 ) {
			var styleIndex = length - 1;
			var lastStyle = styleset.styles[styleIndex];
			number = parseInt( lastStyle.name.replace( /^\D+/g, '') );
			number = number + 1;
		}

		style.name = 'Style ' + number;
		style.stylesetId = styleset._id;

		$http.post('/style', angular.toJson( style ) )
			.success( function( data ) {
				styleset.styles.push( data.style );
			});
	}

	$scope.renameStyle = function( style ) {
		$http.put('/style/' + style._id + '/update', angular.toJson( style ) );
	}

	$scope.archiveStyle = function( style ) {
		$http.put('/style/' + style._id + '/archive')
			.success( function( data ) {
				style.archived = true;
			});
	}

    function initiateEditor(scope) {
    	$scope.ckContent = 'test';

//		var startChapter = $scope.documents[0];
//		$scope.entrybody = startChapter.content;
		// Mangler at tilf??je stylen startChapter.documentstyleSheet
    }

	initiateEditor();

	$scope.$onRootScope('ckDocument:ready', function( event ) {
		$scope.applyDefaultStyleset();
	});

	angular.element(document).ready(function () {

		$scope.showStyleEditor = function() {
			if ( $scope.styleEditorVisible ) {
				$scope.hideStyleEditor();
			} else {
				$rootScope.ck.commands.showFloatingTools.exec();
				$scope.styleEditorVisible = true;
			}
		}

		$scope.hideStyleEditor = function() {
			if ( $scope.styleEditorVisible ) {
				$rootScope.ck.commands.hideFloatingTools.exec();
				$scope.styleEditorVisible = false;
			}
		}

		$scope.$watch('showTypo', function() {
			if ( !$scope.showTypo && $scope.styleEditorVisible ) {
				$scope.hideStyleEditor();
			}
		});



		//editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+startChapter.documentstyleSheet+'.css';

//	    var startChapter = $scope.documents[0];i
//	    $scope.entrybody = startChapter.content;
	    // Mangler at tilf??je stylen startChapter.documentstyleSheet
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
