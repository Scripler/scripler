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

	$scope.saveProjectDocumentUpdates = function( newVal, oldVal ) {
		if ( newVal != oldVal ) {
			var charsDiff = 0;

			charsDiff = newVal.text.length - lastSavedDocumentLength;

			if ( charsDiff > 30 ) {
				if ( typeof $scope.timeout != 'undefined' ) {
					if ( $scope.timeout ) {
						$timeout.cancel( $scope.timeout );
					}
				}
				$scope.updateProjectDocument();
			}
			if ( typeof $scope.timeout != 'undefined' ) {
				if ( $scope.timeout ) {
					$timeout.cancel( $scope.timeout )
				}
			}
			$scope.timeout = $timeout( $scope.updateProjectDocument, secondsToWait * 1000 );
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
					$scope.$watch('documentSelected', $scope.saveProjectDocumentUpdates, true);
					documentWatch = true;
				}

				if ( typeof $scope.ckReady == 'boolean' ) {
					if ( $scope.ckReady) {
						$scope.applyDefaultStyleset();
					}
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
			var lastNumber = parseInt( lastStyleset.name.replace( /^\D+/g, '') );
			if ( lastNumber > 1 ) {
				number = lastNumber + 1;
			}
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
						$scope.documentSelected.defaultStyleset = data.styleset._id;
						$scope.updateProjectDocument();
						$scope.applyStylesetToEditor( data.styleset, true );
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
		var editor = $rootScope.CKEDITOR.instances.bodyeditor;

		promise.then( function( styleset ) {
			var selection = $rootScope.ck.getSelection();
			var selectionLength = selection.getSelectedText().length;
			var tag = selection.getStartElement().getName();

			var lineHeight = style.css['line-height'];
			var margin = style.css['margin'];
			var padding = style.css['padding'];

			if ( typeof lineHeight == 'undefined' &&
				 typeof margin == 'undefined' &&
				 typeof padding == 'undefined' ) {

				//apply character style
				if ( selectionLength == 0 ) {
					var insert;
					if ( typeof style.tag != 'undefined' ) {
						insert = '<' + style.tag + '></' + style.tag + '>';
					} else {
						insert = '<span class="' + style.class + '"></span>';
					}
					var element = $rootScope.CKEDITOR.dom.element.createFromHtml( insert );
					editor.insertElement( element );
					var range = editor.createRange();
					range.moveToElementEditablePosition(element);
					range.select();
				} else {
					if ( typeof style.tag != 'undefined' ) {
						$rootScope.ck.applyStyle( new CKEDITOR.style( {
							element : style.tag
						}));
					} else {
						$rootScope.ck.applyStyle( new CKEDITOR.style( {
							element : 'span',
							attributes : { class : style.class }
						}));
					}
				}

			} else {
				var parents = selection.getStartElement().getParents();
				var firstElement;

				for ( var i = 0; i < parents.length; i++ ) {
					if ( parents[i].getName() === 'body' ) {
						firstElement = parents[i+1];
						break;
					}
				}

				//apply on block level
				if ( typeof firstElement != 'undefined' ) {
					if ( selectionLength == 0 ) {
						//apply on single block
						$scope.applyStyleToElement( firstElement, style );
					} else {
						//apply on selection or multiple blocks
						var range = editor.getSelection().getRanges();
						var walker = new CKEDITOR.dom.walker( range[0] ), node;
						var isNotWhitespace = CKEDITOR.dom.walker.whitespaces( true );
						var applyToParent = false;
						var counter = 0;
						var endNode = range[0].endContainer;

						walker.guard = function( node, isMoveout )
						{
							if ( node.$.nodeName === endNode.$.nodeName &&
								node.$.nodeType === endNode.$.nodeType &&
								node.$.nodeValue === endNode.$.nodeValue &&
								node.$.parentNode === endNode.$.parentNode &&
								node.$.length === endNode.$.length ) {

								return false; //ends walker
							}

							return true;
						};

						while ( node = walker.next() ) {

							//if first element in a selection is a text node
							//apply style to parent node closest to the document body
							//this happens if a user selects a span in a paragraph and applies block level style
							if ( counter === 0 && node.type === 3 ) {
								applyToParent = true;
							}

							//if a node is an element
							if ( node.type === 1 && isNotWhitespace( node ) ) {
								var computedStyle = node.getComputedStyle( 'display' );

								if ( computedStyle === 'block' ) {
									$scope.applyStyleToElement( node, style );
								}
							}

							counter++;
						}

						//!!!this is done after the walker because it messes up the selection if done inside the walker
						if ( applyToParent ) {
							$scope.applyStyleToElement( firstElement, style );
						}
					}
				}
			}

		});
	}

	$scope.applyStyleToElement = function( element, style ) {
		if ( typeof style.tag != 'undefined' ) {
			element.removeAttribute( 'class' );
			element.renameNode( style.tag );
		} else {
			if ( typeof style.class != 'undefined' ) {
				element.addClass( style.class );
			}
		}
	}

	$scope.addNewStyle = function( styleset ) {
		var style = {};

		var length = styleset.styles.length;
		var number = length + 1;

		if ( length > 1 ) {
			var styleIndex = length - 1;
			var lastStyle = styleset.styles[styleIndex];
			var lastNumber = parseInt( lastStyle.name.replace( /^\D+/g, '') );
			if ( lastNumber > 1 ) {
				number = lastNumber + 1;
			}
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

	$scope.insertOptionChoosen = function(insertoption) {
		if ($scope.activeInsertOption === insertoption) {
			$scope.activeInsertOption = null;
		}
		else {
			$scope.activeInsertOption = insertoption;
		}
	}

	$scope.insertImageOption = function(imageoption) {
		if ($scope.activeImageOption === imageoption) {
			$scope.activeImageOption = null;
		}
		else {
			$scope.activeImageOption = imageoption;
		}
	}

    function initiateEditor(scope) {
    	$scope.ckContent = 'test';

//		var startChapter = $scope.documents[0];
//		$scope.entrybody = startChapter.content;
		// Mangler at tilf??je stylen startChapter.documentstyleSheet
    }

	initiateEditor();

	$scope.$onRootScope('ckDocument:ready', function( event ) {
		$scope.ckReady = true;
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

		$scope.insertPageBreak = function() {
			$rootScope.ck.commands.pagebreak.exec();
		}
		$scope.insertPageBreakAvoid = function() {
			$rootScope.ck.commands.pagebreakavoid.exec();
		}

		//editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+startChapter.documentstyleSheet+'.css';

//	    var startChapter = $scope.documents[0];
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
