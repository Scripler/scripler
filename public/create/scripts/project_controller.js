'use strict'

function projectController( $scope, $location, userService, projectsService, $http, $upload, ngProgress, $timeout, $rootScope, utilsService, $q, user ) {

	var timeout = null,
		timeoutMetadata = null,
		lastSavedDocumentLength = 0,
		documentWatch = false,
		secondsToWait = 5,
		resetUndoHistory = false;

	$scope.pid = ($location.search()).pid;
	$scope.user = user;
	$scope.projectDocuments = [];
	$scope.stylesets = [];
	$scope.fonts = [];
	$scope.styleEditorVisible = false;

	if ( $scope.user === 'undefined' ) {
		// TODO: how to handle error? (awaiting "Show error messages to the user" task)
		console.log("ERROR: user is undefined!");
	} else {
		var projectPromise = projectsService.getProject( $scope.pid );

		projectPromise.then( function( project ) {
			$scope.project = project;
			var metadataChanged = false;
			if (!$scope.project.metadata.title) {
				$scope.project.metadata.title = $scope.project.name;
				metadataChanged = true;
			}
			if (!$scope.project.metadata.authors){
				$scope.project.metadata.authors = $scope.user.firstname + ' ' + $scope.user.lastname;
				metadataChanged = true;
			}
			if (!project.metadata.language) {
				$scope.selectedLanguageName = "English";
				$scope.project.metadata.language = "en";
				metadataChanged = true;
			} else {
				for (var i = 0; i < $scope.languages.length; i++) {
					var language = $scope.languages[i];
					if (language.subtag == project.metadata.language) {
						$scope.selectedLanguageName = language.description;
						break;
					}
					// If unknown language is used, just show it directly
					$scope.selectedLanguageName = project.metadata.language;
				}
			}
			if (metadataChanged) {
				$scope.saveMetaData();
			}
			$scope.projectDocuments = $scope.project.documents;

			if ( $scope.projectDocuments.length == 0 ) {
				$scope.addProjectDocument( 'firstDocument', '' );
			} else {
				var index = getIndexForDocumentToDisplay($scope.projectDocuments, 0);
				$scope.openProjectDocument( $scope.projectDocuments[index] );
			}
		});
	}

	$scope.focusEditor = function() {
        setTimeout(function() {
			$rootScope.ck.focus();
		}, 500);
	}

	$scope.openFeedback = function() {
		userService.openFeedback( $scope.user );
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
			}).error(function(data, status) {
				if (status == 402) {
					window.alert(data.errorMessage);
				}
			}).success(function(data, status, headers, config) {
				ngProgress.complete();
				$scope.projectDocuments.push( data.document );
				$scope.openProjectDocument( data.document );
			});
		}
	};

	$scope.uploadImages = function( $files, type ) {
		for (var i = 0; i < $files.length; i++) {
			var file = $files[i];
			ngProgress.start();
			$scope.upload = $upload.upload({
				url: '/image/' + $scope.pid + '/upload',
				file: file
			}).progress(function(evt) {
				ngProgress.set(parseInt(100.0 * evt.loaded / evt.total) - 25);
			}).error(function(data, status) {
				if (status == 402) {
					window.alert(data.errorMessage);
				}
			}).success(function(data, status, headers, config) {
				ngProgress.complete();
				if ( typeof type !== 'undefined' ) {
					if ( type === 'cover' ) {
						$scope.createCover( data.images[0] );
					}
					if ( type === 'image' ) {
						$scope.insertNewImage( data.images[0] );
					}
				}
			});
		}
	};

    $scope.onCoverSelect = function($files) {
        $scope.uploadImages($files, 'cover');
	}
    $scope.onImageSelect = function($files) {
        $scope.uploadImages($files, 'image');
	}

	$scope.sortable_option = {
        stop: function(list, drop_item) {
            $scope.rearrange(list);
		}
	};

    $scope.rearrange = function(list) {
		var data = {};
		var documentIds = [];

        angular.forEach(list, function(document) {
            documentIds.push(document._id);
		})

		data.documents = documentIds;

        if ($scope.user._id) {
            $http.put('/document/' + $scope.pid + '/rearrange', angular.toJson(data))
                .success(function() {});
		} else {
			//save to localstorage
		}
	}

    $scope.saveProjectDocumentUpdates = function(newVal, oldVal) {
        if (newVal != oldVal) {
			var charsDiff = 0;

			charsDiff = newVal.text.length - lastSavedDocumentLength;

            if (charsDiff > 30) {
                if (typeof $scope.timeout != 'undefined') {
                    if ($scope.timeout) {
                        $timeout.cancel($scope.timeout);
					}
				}
				$scope.updateProjectDocument();
			} else {
                if (typeof $scope.timeout != 'undefined') {
                    if ($scope.timeout) {
                        $timeout.cancel($scope.timeout)
					}
                } 
                $scope.timeout = $timeout($scope.updateProjectDocument, secondsToWait * 1000); 
			}
		}
	};

    $scope.openProjectDocument = function(projectDocument) {
		var deferred = $q.defer();

        if (typeof $scope.documentSelected == 'object') {
			$scope.updateProjectDocument();
		}

		$http.get('/document/' + projectDocument._id)
            .success(function(data) {
                var index = $scope.projectDocuments.indexOf(projectDocument);
				$scope.projectDocuments[index] = data.document;
				$scope.documentSelected = data.document;
				$scope.showProjectDocument(data.document._id);
				lastSavedDocumentLength = data.document.text.length;

				if ( !$scope.documentWatch ) {
					$scope.$watch('documentSelected', $scope.saveProjectDocumentUpdates, true);
                    $scope.documentWatch = true;  
				}

				resetUndoHistory = true;
				deferred.resolve();
			})

		return deferred.promise;
	}


    $scope.move = function(array, from, to) {
        if (to === from) return;

        var target = array[from];
	  var increment = to < from ? -1 : 1;

        for (var k = from; k != to; k += increment) {
	    array[k] = array[k + increment];
	  }
	  array[to] = target;
	}


    $scope.addProjectDocument = function(type, text) {
		var coverExists = false;
		var tocExists = false;
		var titlePageExists = false;

		var deferred = $q.defer();

		var order = $scope.projectDocuments.length + 1;

		var name = "Untitled " + order;
		var document = {};

		if (type == 'cover') {
			document.name = 'Cover';
        } else if (type == 'colophon') {
			document.name = 'Colophon';
        } else if (type == 'toc') {
			document.name = 'Table of Contents';
        } else if (type == 'titlepage') {
			document.name = 'Titlepage';
        } else {
			document.name = name;
		}

		// HACK: Empty string as text gives huge problems when switching between documents
		// - CK and model get out of sync.
		document.text = ' ';

        if (typeof type !== 'undefined' && type !== 'firstDocument') {
			document.type = type;
		}
        if (typeof text !== 'undefined' && text != '') {
			document.text = text;
		}

        if ($scope.user._id) {
			document.projectId = $scope.pid;

            $http.post('/document', angular.toJson(document))
                .success(function(data) {

					data.document.editingNewProjectDocument = true;

                    if (typeof data.document.type !== 'undefined' && data.document.type !== 'firstDocument') {

                        for (var i = 0; i < order - 1; i++) {
                            if ($scope.projectDocuments[i].type == 'cover') coverExists = true;
                            else if ($scope.projectDocuments[i].type == 'toc') tocExists = true;
                            else if ($scope.projectDocuments[i].type == 'titlepage') titlePageExists = true;
						    }

						if (type == 'cover') {
                            $scope.projectDocuments.unshift(data.document);
                            $scope.rearrange($scope.projectDocuments);
                        } else if (type == 'colophon') {
                            $scope.projectDocuments.push(data.document);
                            $scope.rearrange($scope.projectDocuments);
                        } else if (type == 'toc') {
                            $scope.projectDocuments.unshift(data.document);
                            $scope.rearrange($scope.projectDocuments);
                            if (coverExists && titlePageExists) {
								$scope.move($scope.projectDocuments, 0, 2);
                            } else if (coverExists && !titlePageExists) {
								$scope.move($scope.projectDocuments, 0, 1);
                            } else if (!coverExists && titlePageExists) {
								$scope.move($scope.projectDocuments, 0, 1);
							}
                        } else if (type == 'titlepage') {
                            $scope.projectDocuments.unshift(data.document);
                            $scope.rearrange($scope.projectDocuments);
                            if (coverExists) {
								$scope.move($scope.projectDocuments, 0, 1);
							}
						}

						$scope.openProjectDocument( data.document );
						$scope.showLeftMenu('contents', true);
					} 
					else{

                        if (type !== 'firstDocument') {
							data.document.editingProjectDocumentTitle = true;
						}

                        $scope.projectDocuments.push(data.document);

                        if (type == 'firstDocument') {
                            $scope.openProjectDocument(data.document);
						}
					}
				})
		} else {
			document._id = Date.now();
            $scope.projectDocuments.push(document);
			deferred.resolve();
		}

		return deferred.promise;
	}

	$scope.updateProjectDocument = function() {
		var deferred = $q.defer();
		var document = angular.copy( $scope.documentSelected );
		lastSavedDocumentLength = document.text.length;
		document.text = $scope.ck.getData();

        if ($scope.user._id) {
            $http.put(/document/ + document._id + '/update', angular.toJson(document))
                .success(function() {
					// TODO: what is the standard/easiest way of formatting dates in JavaScript? Use moment.js?
					var now = new Date();
					var hours = now.getHours() < 10 ? '0' + now.getHours() : now.getHours();
					var minutes = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
					var seconds = now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds();
					//months are counted in js from 0-11 so for simplicity the month in the ui is given +1 
					$scope.lastSaved = 'Last saved: ' + now.getDate() + '/' + (now.getMonth()+1) + '/' + now.getFullYear() + ' ' + hours + ':' + minutes + ':' + seconds;
					deferred.resolve();
				});

				return deferred.promise;
		} else {
			//TODO save to localstorage
		}
	};

	function getIndexForDocumentToDisplay(documents, oldIndex) {
		var result;

		if (documents && documents.length > 0) {
            for (var i = 0; i < documents.length; i++) {
				var document = documents[i];

				var currentNext = i + oldIndex;
				if (currentNext < documents.length) {
					var nextDocument = documents[currentNext];
					if (nextDocument.archived == false) {
						result = currentNext;
						break;
					}
				}

				var currentPrevious = oldIndex - i;
				if (currentPrevious >= 0) {
					var previousDocument = documents[currentPrevious];
					if (previousDocument.archived == false) {
						result = currentPrevious;
						break;
					}
				}
			}
		} else {
			console.log("ERROR: it is not possible to archive the last document");
		}
		return result;
	};

    $scope.archiveProjectDocument = function(projectDocument) {
		if ($scope.projectDocuments.length > 0) {
            var index = $scope.projectDocuments.indexOf(projectDocument);
            if ($scope.user._id) {
				$http.put('/document/' + projectDocument._id + '/archive')
                    .success(function() {
						projectDocument.archived = true;
						if (utilsService.mongooseEquals(projectDocument, $scope.documentSelected)) {
							var newIndex = getIndexForDocumentToDisplay($scope.projectDocuments, index);
							if (newIndex >= 0) {
								$scope.openProjectDocument($scope.projectDocuments[newIndex]);
							} else {
								// TODO: handle error how?
							}
						}
					});
			} else {
				projectDocument.archived = true;
			}
		} else {
			// TODO: this message should be shown to the user
			console.log("ERROR: it is not possible to archive the last document");
		}
	};

    $scope.unarchiveProjectDocument = function(projectDocument) {
		var deferred = $q.defer();

        if ($scope.user._id) {
			$http.put('/document/' + projectDocument._id + '/unarchive')
                .success(function() {
					projectDocument.archived = false;

					var waitPromise = $scope.openProjectDocument(projectDocument);
                    waitPromise.then(function() {
                        deferred.resolve();
					});
				});
		} else {
			projectDocument.archived = false;
			deferred.resolve();
		}

		return deferred.promise;
	};

	$scope.renameProjectDocument = function(projectDocument) {
        if ($scope.user._id) {
            $http.put('/document/' + projectDocument._id + '/rename', angular.toJson(projectDocument))
                .success(function() {
					if (projectDocument.editingNewProjectDocument) {
						$scope.openProjectDocument(projectDocument);
					}
				});
		} else {
			//TODO save to localstorage
		}
		$scope.focusEditor();
	};

	$scope.selectedProjectDocument = -1;
	$scope.showProjectDocument = function ($index) {
		if ($index != $scope.selectedProjectDocument) {
			$scope.selectedProjectDocument  = $index;
		}
	};

	$scope.selectedProjectDocumentOptions = -1;
    $scope.showProjectDocumentOptions = function($index) {
		if ($index != $scope.selectedProjectDocumentOptions) {
			$scope.selectedProjectDocumentOptions  = $index;
        } else {
			$scope.hideProjectDocumentOptions();
		}
		$scope.focusEditor();
	};
    $scope.hideProjectDocumentOptions = function() {
		$scope.selectedProjectDocumentOptions = -1;
	};

	$scope.showLeftMenu = function (status, preserve) {
		if (status != $scope.leftMenuShowItem || preserve) {
			$scope.leftMenuShow = true;
			$scope.leftMenuShowItem = status;

			if ( $scope.leftMenuShowItem != 'design' && $scope.styleEditorVisible ) {
				$scope.hideStyleEditor();
			}

			$scope.selectedStyle.scroll = true;
		}
		else {
			$scope.hideLeftMenu();
			
			if ( $scope.styleEditorVisible ) {
				$scope.hideStyleEditor();
			}
		}

		$scope.focusEditor();
	}
	$scope.hideLeftMenu = function (status) {
		$scope.leftMenuShow = false;
		$scope.leftMenuShowItem	= "";
	}

	$scope.showRightMenu = function (status) {
		if (status != $scope.rightMenuShowItem) {
			$scope.rightMenuShow = true;
			$scope.rightMenuShowItem = status;
		}
		else {
			$scope.hideRightMenu();
		}
		$scope.focusEditor();
	}
	$scope.hideRightMenu = function (status) {
		$scope.rightMenuShow = false;
		$scope.rightMenuShowItem	= "";
	}

	$scope.languages = [
		{
			"subtag": "arb",
			"description": "Arabic"
    }, {
			"subtag": "bn",
			"description": "Bengali"
    }, {
			"subtag": "es",
			"description": "Spanish / Castilian"
    }, {
			"subtag": "zh",
			"description": "Chinese"
    }, {
			"subtag": "da",
			"description": "Danish"
    }, {
			"subtag": "nl",
			"description": "Dutch / Flemish"
    }, {
			"subtag": "en",
			"description": "English"
    }, {
			"subtag": "fo",
			"description": "Faroese"
    }, {
			"subtag": "fi",
			"description": "Finnish"
    }, {
			"subtag": "fr",
			"description": "French"
    }, {
			"subtag": "de",
			"description": "German"
    }, {
			"subtag": "kl",
			"description": "Greenlandic / Kalaallisut"
    }, {
			"subtag": "hi",
			"description": "Hindi"
    }, {
			"subtag": "is",
			"description": "Icelandic"
    }, {
			"subtag": "ja",
			"description": "Japanese"
    }, {
			"subtag": "ko",
			"description": "Korean"
    }, {
			"subtag": "cmn",
			"description": "Mandarin Chinese"
    }, {
			"subtag": "nn",
			"description": "Norwegian Nynorsk"
    }, {
			"subtag": "no",
			"description": "Norwegian"
    }, {
			"subtag": "nb",
			"description": "Norwegian Bokmål"
    }, {
			"subtag": "pt",
			"description": "Portuguese"
    }, {
			"subtag": "ru",
			"description": "Russian"
    }, {
			"subtag": "sv",
			"description": "Swedish"
    }, {
			"subtag": "th",
			"description": "Thai"
    }, ];

	$scope.saveMetaData = function() {
		var deferred = $q.defer();
		$http.put('/project/' + $scope.project._id + '/metadata', {
			'title': $scope.project.metadata.title,
			'authors': $scope.project.metadata.authors,
			'language': $scope.project.metadata.language,
			'description': $scope.project.metadata.description,
			'isbn': $scope.project.metadata.isbn
        }).success(function() {
			deferred.resolve();
		});

		return deferred.promise;
	};

	$scope.$watch('rightMenuShowItem', function( newValue ) {
		if( newValue=='finalize' ){
			$scope.getToc();
		}
	});

    $scope.$watch('project.metadata.title', function(newValue, oldValue){
		if (watchReady(newValue, oldValue)) {
			$scope.saveMetaData();
			$scope.metaTitleSaved = true;
			$timeout(function() {
			    $scope.metaTitleSaved = false;
			}, 1000);
		}
	});
    $scope.$watch('project.metadata.authors', function(newValue, oldValue) {
		if (watchReady(newValue, oldValue)) {
			$scope.saveMetaData();
			$scope.metaAuthorsSaved = true;
			$timeout(function() {
			    $scope.metaAuthorsSaved = false;
			}, 1000);
		}
	});
    $scope.$watch('project.metadata.description', function(newValue, oldValue) {
		if (watchReady(newValue, oldValue)) {
			$scope.saveMetaData();
			$scope.metaDescriptionSaved = true;
			$timeout(function() {
			    $scope.metaDescriptionSaved = false;
			}, 1000);
		}
	});
    $scope.$watch('project.metadata.isbn', function(newValue, oldValue) {
		if (watchReady(newValue, oldValue)) {
			$scope.saveMetaData();
			$scope.metaIsbnSaved = true;
			$timeout(function() {
			     $scope.metaIsbnSaved = false;
			}, 1000);
		}
	});

	function watchReady(newValue, oldValue) {
		return !(typeof oldValue === 'undefined') && newValue != '' && newValue != oldValue;
	}

	$scope.selectedLanguage = function(str) {
		if (str) {
			$scope.project.metadata.language = str.originalObject.subtag;
			$scope.saveMetaData();
			$scope.metaLanguageSaved = true;
			$timeout(function() {
			    $scope.metaLanguageSaved = false;
			}, 1000);
		}
	};

	$scope.exportEpub = function() {
		var getTocPromise = $scope.getToc();
		var updateProjectDocumentPromise = $scope.updateProjectDocument();
		var updateMetadataPromise = $scope.saveMetaData();

		$q.all([getTocPromise, updateProjectDocumentPromise, updateMetadataPromise]).then(function () {
			var setTocPromise = $scope.setToc();
            setTocPromise.then(function() {
				$http.get('/project/' + $scope.pid + '/compile')
                    .success(function(data, status) {
						if (data.url) {
							window.location.href = "/project/" + $scope.pid + "/epub";
						} else {
							console.log("Error compiling, status ok, but return value is: " + JSON.stringify(data));
						}
					})
                    .error(function(status) {
						console.log("Error compiling, status: " + status);
					});
			});
		});

	}

    $scope.openStylesets = function(projectDocument) {
		var deferred = $q.defer();

		$http.get('/document/' + projectDocument._id + '/stylesets')
            .success(function(data) {
				$scope.stylesets = data.stylesets;
				deferred.resolve();
			});

		return deferred.promise;
	}

	$scope.addNewStyleset = function() {
		var styleset = {};
		var length = $scope.stylesets.length;
		var number = length + 1;

        if (length > 1) {
			var stylesetIndex = length - 1;
			var lastStyleset = $scope.stylesets[stylesetIndex];
            var lastNumber = parseInt(lastStyleset.name.replace(/^\D+/g, ''));
            if (lastNumber > 1) {
				number = lastNumber + 1;
			}
		}

		styleset.name = 'Untitled ' + number;

        $http.post('/styleset', angular.toJson(styleset))
            .success(function(data) {
				data.styleset.editingStyleSetTitle = true;
                $scope.stylesets.push(data.styleset);
			});
	}

    $scope.renameStyleset = function(styleset) {
        $http.put('/styleset/' + styleset._id + '/update', angular.toJson(styleset));
	}

    $scope.archiveStyleset = function(styleset) {
		$http.put('/styleset/' + styleset._id + '/archive')
            .success(function(data) {
				styleset.archived = true;
			});
	}

	$scope.applyStylesetToProject = function(styleset) {
		var deferred = $q.defer();
		//apply-to-project handles all styleset copy stuff and sets default stylesets first, but immediately after,
		//apply-to-document is also called because we need the proper document styleset to set for the selected document.

		$http.put('/styleset/' + styleset._id + '/project/' + $scope.project._id)
			.success(function(data) {
				var promise = $scope.applyStylesetToDocument(styleset, true);
				promise.then(function() {
					deferred.resolve();
				});
			});

		return deferred.promise;
	}

	$scope.applyStylesetToDocument = function(styleset, setAsDefault) {
		var deferred = $q.defer();
		$http.put('/styleset/' + styleset._id + '/document/' + $scope.documentSelected._id)
			.success(function(data) {
				if (data.styleset) {
					$scope.documentSelected.stylesets.push(data.styleset._id);
					if (setAsDefault) {
						$scope.documentSelected.defaultStyleset = data.styleset._id;
					}
					$scope.applyStylesetsToEditor();
					deferred.resolve(data.styleset);
				}
			});

		return deferred.promise;
	}

	$scope.applyStylesetsToEditor = function() {
		//when switching documents documentSelected can be undefined
		//because of that promise is only created when document is defined
        if (typeof $scope.documentSelected._id !== 'undefined') {
            var promise = $scope.openStylesets($scope.documentSelected);

            promise.then(function() {
				applyStylesets();
			});
		}
	}

	var getCombinedCss = function() {
		var combinedCSS = '';

        for (var i = 0; i < $scope.stylesets.length; i++) {
            if ($scope.documentSelected.stylesets.indexOf($scope.stylesets[i]._id) > -1) {
                if ($scope.documentSelected.defaultStyleset == $scope.stylesets[i]._id) {
                    combinedCSS += utilsService.getStylesetContents($scope.stylesets[i], true);
				} else {
                    combinedCSS += utilsService.getStylesetContents($scope.stylesets[i], false);
				}
			}
		}

		return combinedCSS;
	}

	var createStyleTag = function() {
        var style = new CKEDITOR.dom.element('style');
		style.$.id = 'custom-scripler-css';
        var cssText = new CKEDITOR.dom.text($scope.combinedCSS);
        style.append(cssText);
		return style;
	}

	var applyStylesets = function() {
		$scope.combinedCSS = getCombinedCss();

		var ckDocument = $rootScope.ck.document;
		var element = ckDocument.getById('custom-scripler-css');

        if ($scope.combinedCSS !== '') {
            if (element === null) {
				var style = createStyleTag();
                ckDocument.getHead().append(style);
			} else {
				element.remove();
				var style = createStyleTag();
                ckDocument.getHead().append(style);
			}
		}
    }  

    $scope.applyStyle = function(styleset, style) {
        var styleIndex = styleset.styles.indexOf(style);

		var editor = getEditor();

		var isDefault = styleset._id === $scope.documentSelected.defaultStyleset;

		//when applying styleset to document, the styles get copied to new (document) styleset
        if (style._id != styleset.styles[styleIndex]._id) {
			style = styleset.styles[styleIndex];
		}

		var selection = $rootScope.ck.getSelection();
		var selectedRanges = selection.getRanges();
		var selectionLength = selection.getSelectedText().length;
		var tag = selection.getStartElement().getName();
        var bookmarks = selectedRanges.createBookmarks2(false);

		var lineHeight = style.css['line-height'];
		var margin = style.css['margin'];
		var padding = style.css['padding'];

		//character style code commented out for now
		/*if ( typeof lineHeight == 'undefined' &&
			typeof margin == 'undefined' &&
			typeof padding == 'undefined' ) {

			//apply character style
			if ( selectionLength == 0 ) {
				var insert;
				if ( typeof style.tag != 'undefined' ) {
					if ( isDefault ) {
						insert = '<' + style.tag + '></' + style.tag + '>';
					} else {
						insert = '<' + style.tag + 'class="style-' + style._id + '></' + style.tag + '>';
					}
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
					$scope.applyCharStyleToElement( style, isDefault );
				} else {
					$rootScope.ck.applyStyle( new CKEDITOR.style( {
						element : 'span',
						attributes : { class : style.class }
					}));
				}
			}

		} else {*/

		var parents = selection.getStartElement().getParents();
		var firstElement;

        for (var i = 0; i < parents.length; i++) {
            if (parents[i].getName() === 'body') {
                firstElement = parents[i + 1];
				break;
			}
		}

		//apply on block level
        if (typeof firstElement != 'undefined') {
            if (selectionLength == 0) {
				//apply on single block
                $scope.applyStyleToElement(firstElement, style, isDefault);
			} else {
				var applyToParent = false;
                applyToParent = $scope.applyToSelectionWalker(editor, style, isDefault);

				//!!!this is done after the walker because it messes up the selection if done inside the walker
                if (applyToParent) {
                    $scope.applyStyleToElement(firstElement, style, isDefault);
				}
			}
		}

		$scope.selectedStyle = style;

        if ($scope.documentSelected.stylesets.indexOf(styleset._id) < 0) {
            var promise = $scope.applyStylesetToDocument(styleset, false);
            promise.then(function(styleset) {
				//replace class only if style is not from default styleset
                if (!isDefault) {
                    for (var i = 0; i < styleset.styles.length; i++) {
						var newStyle = styleset.styles[i];
                        if (newStyle.name === style.name &&
							 newStyle.class === style.class &&
                            newStyle.tag === style.tag) {

							$scope.selectedStyle = newStyle;
							break;
						}
					}

					var editableBody = document.getElementById('cke_bodyeditor');
					var iframe = editableBody.getElementsByTagName('iframe')[0];
					var iDoc = iframe.contentDocument;
                    var elements = iDoc.getElementsByClassName('style-' + style._id);

                    for (var i = 0; i < elements.length; i++) {
						elements[i].className = 'style-' + $scope.selectedStyle._id;
					}
				}
			});
		} else {
			$scope.applyStylesetsToEditor();
		}

        $scope.updateProjectDocument();
        $scope.focusEditor();

        selectedRanges.moveToBookmarks(bookmarks);
        selection.selectRanges(selectedRanges);
	}

    $scope.applyCharStyleToElement = function(style, isDefault) {
        if (isDefault) {
            $rootScope.ck.applyStyle(new CKEDITOR.style({
                element: style.tag
			}));
		} else {
            $rootScope.ck.applyStyle(new CKEDITOR.style({
                element: style.tag,
                attributes: {
                    class: 'style-' + style._id
                }
			}));
		}
	}

    $scope.applyStyleToElement = function(element, style, isDefault) {

        if (typeof style.tag != 'undefined') {
            element.removeAttribute('class');
            element.renameNode(style.tag);

            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(style.tag) > -1) {
                if (element.getId() === null) {
					element.$.id = 'id_' + Date.now();
				}
			}
		}

        if (isDefault) {
            if (typeof style.class != 'undefined') {
                element.addClass(style.class);
			}
		} else {
            element.addClass('style-' + style._id);
		}

	}

    $scope.applyToSelectionWalker = function(editor, style, isDefault) {

		//apply on selection or multiple blocks
		var range = editor.getSelection().getRanges();
        var walker = new CKEDITOR.dom.walker(range[0]),
            node;
        var isNotWhitespace = CKEDITOR.dom.walker.whitespaces(true);
		var applyToParent = false;
		var counter = 0;
		var endNode = range[0].endContainer;

        walker.guard = function(node, isMoveout) {
            if (counter != 0 &&
				node.$.nodeName === endNode.$.nodeName &&
				node.$.nodeType === endNode.$.nodeType &&
				node.$.nodeValue === endNode.$.nodeValue &&
				node.$.parentNode === endNode.$.parentNode &&
                node.$.length === endNode.$.length) {

				return false; //ends walker
			}

			return true;
		};

        while (node = walker.next()) {

			//if first element in a selection is a text node
			//apply style to parent node closest to the document body
			//this happens if a user selects a span in a paragraph and applies block level style
            if (counter === 0 && node.type === 3) {
				applyToParent = true;
			}

			//if a node is an element
            if (node.type === 1 && isNotWhitespace(node)) {
                var computedStyle = node.getComputedStyle('display');

                if (computedStyle === 'block') {
                    $scope.applyStyleToElement(node, style, isDefault);
				}
			}

			counter++;
		}

		return applyToParent;
	}

    $scope.addNewStyle = function(styleset, style, index) {
		var newStyle = {};

        if (typeof style !== 'undefined') {
			newStyle = style;
		}

		var length = styleset.styles.length;
		var number = length + 1;

        if (length > 1) {
			var styleIndex = length - 1;
			var lastStyle = styleset.styles[styleIndex];
            var lastNumber = parseInt(lastStyle.name.replace(/^\D+/g, ''));
            if (lastNumber > 1) {
				number = lastNumber + 1;
			}
		}

		newStyle.name = 'Style ' + number;
		newStyle.stylesetId = styleset._id;

        if (typeof newStyle.css == 'undefined') {
			newStyle.css = getStyleCSS();
		}

        $http.post('/style', angular.toJson(newStyle))
            .success(function(data) {
				var style = data.style

				style.class = "style-" + style._id;
                $scope.updateStyle(style);

                if (index > -1) {
                    styleset.styles.splice(index + 1, 0, style);
				} else {
					style.editingStyleTitle = true;
                    styleset.styles.push(style);
				}
			});
	}

    $scope.updateStyle = function(style) {
        $http.put('/style/' + style._id + '/update', angular.toJson(style));
	}

    $scope.archiveStyle = function(style) {
		$http.put('/style/' + style._id + '/archive')
            .success(function(data) {
				style.archived = true;
			});
	}

    function getStyle(el, styleProp) {
        if (el.currentStyle)
			var y = el.currentStyle[styleProp];
        else if (window.getComputedStyle)
            var y = document.defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
		return y;
	}

	//discrepancy between text-decoration and the computed text-decoration
	//computed has extra values that breaks CSS "underline solid rgb(0,0,0)"
	//because of that only take first word from text-decoration
    function getStyles(element, styles, activeCSS) {
        styles.forEach(function(style) {
			var cssStyle = getStyle(element.$, style);
            if (cssStyle !== "" && cssStyle !== null) {
                if (style === 'text-decoration') {
                    var firstWord = cssStyle.match(/^[A-Za-z_]+/);
					activeCSS[style] = firstWord[0];
				} else {
					activeCSS[style] = cssStyle;
				}
			}
		});

		return activeCSS;
	}

	function getStyleCSS() {
		var selection = $rootScope.ck.getSelection();
		var element = selection.getStartElement();

        var styles = ['font-size', 'font-family', 'font-weight', 'font-style', 'color', 'text-decoration',
					  'margin', 'padding', 'line-height', 'hyphens', 'page-break-inside', 'quotes', 'border',
            'text-indent', 'background-color', 'list-style'
        ];
		var activeCSS = {};
        activeCSS = getStyles(element, styles, activeCSS);

		return activeCSS;
	}

    $scope.saveAsCharStyle = function(styleset, style) {
		var selection = $rootScope.ck.getSelection();
		var element = selection.getStartElement();
		var inlineCSS = {};
        var index = styleset.styles.indexOf(style);

        if (element.hasAttribute('style')) {
            var styleAttributes = element.getAttribute('style');

            var matches = styleAttributes.match(/([\w-]+)\s*:\s*([^;]+)\s*;?/);

            for (var x = 0; x < matches.length; x++) {
                if (x % 3 !== 0) {
                    if (['margin', 'padding', 'line-height', 'margin-top', 'margin-bottom', 'margin-right',
                        'margin-left', 'padding-top', 'padding-bottom', 'padding-right', 'padding-left'
                    ].indexOf(matches[x]) < 0) {
                        inlineCSS[matches[x]] = matches[x + 1];
						x++; //skip next one because it has been assigned
					}
				}
			}
		}

        var styles = ['font-weight', 'font-style', 'text-decoration'];
        inlineCSS = getStyles(element, styles, inlineCSS);

		var style = {};
		style.css = inlineCSS;

        $scope.addNewStyle(styleset, style, index);

		$scope.copyCSS = false;
	}

    $scope.isDefaultStyleset = function(styleset) {
		return styleset._id === $scope.documentSelected.defaultStyleset;
	}

    $scope.saveAsBlockStyle = function(styleset, style) {
        var index = styleset.styles.indexOf(style);
        var newStyle = angular.copy(style);
		newStyle.css = getStyleCSS();

        $scope.addNewStyle(styleset, newStyle, index);

		$scope.copyCSS = false;
	}

    $scope.overwriteStyle = function(style) {
		var activeCSS = getStyleCSS();

        var newStyle = angular.copy(style);
		newStyle.css = activeCSS;

        $scope.updateStyle(newStyle);

		$scope.copyCSS = false;
	}

    $scope.getStyleStyling = function(style) {
        var styleCSS = angular.copy(style.css);

        if (style.tag === 'h1') {
			styleCSS['font-size'] = '2em';
		}
        if (style.tag === 'h2') {
			styleCSS['font-size'] = '1.7em';
		}
        if (style.tag === 'h3') {
			styleCSS['font-size'] = '1.5em';
		}
        if (style.tag === 'h4') {
			styleCSS['font-size'] = '1.3em';
		}
        if (style.tag === 'h5') {
			styleCSS['font-size'] = '1.2em';
		}
        if (style.tag === 'h6') {
			styleCSS['font-size'] = '1.1em';
		}

        if (typeof styleCSS['line-height'] !== 'undefined') {
            delete styleCSS['line-height'];
		}

		return styleCSS;
	}

    $scope.setStylesetStyling = function(styleset, style) {
        var stylesetCSS = angular.copy(style.css);
        stylesetCSS['font-size'] = '1.5em';
		var family = stylesetCSS['font-family'];
		var fontStyle = stylesetCSS['font-style'];
		var weight = stylesetCSS['font-weight'];
        delete stylesetCSS['margin'];
        delete stylesetCSS['line-height'];

		var font = family.split(',')[0];
		font = font.replace(/"/g, '');
		var fs = 'n';

        if (fontStyle === 'italic') {
			fs = 'i';
		}
        if (fontStyle === 'oblique') {
			fs = 'o';
		}

        font = '"' + font + ':' + fs + weight / 100 + '"';
        $scope.fonts.push(font);

		styleset.css = stylesetCSS;
	}

	$scope.selectedStylesetOptions = -1;
    $scope.showStylesetOptions = function($index) {
		if ($index != $scope.selectedStylesetOptions) {
			$scope.selectedStylesetOptions  = $index;
			$scope.hideStylesetChildOptions();
		}
		else {
			$scope.hideStylesetOptions();
		}
	};
    $scope.hideStylesetOptions = function() {
		$scope.selectedStylesetOptions = -1;
	};

	$scope.selectedStylesetParentOptions = -1;
	$scope.selectedStylesetChildOptions = -1;
	$scope.showStylesetChildOptions = function ($parentIndex, $index) {
		if ($parentIndex != $scope.selectedStylesetParentOptions || $index != $scope.selectedStylesetChildOptions) {
			$scope.selectedStylesetParentOptions  = $parentIndex;
			$scope.selectedStylesetChildOptions  = $index;
			$scope.hideStylesetOptions();
		}
		else {
			$scope.hideStylesetChildOptions();
		}
	};
	$scope.hideStylesetChildOptions = function () {
		$scope.selectedStylesetParentOptions = -1;
		$scope.selectedStylesetChildOptions = -1;
	};

	$scope.loadFonts = function() {
		WebFont.load({
			custom: {
				families: $scope.fonts,
				urls: ['stylesets/non-editable.css']
			}
		});
	}

	$scope.getToc = function() {
		var deferred = $q.defer();
		$http.get('/project/' + $scope.project._id + '/toc')
            .success(function(data) {
				$scope.toc = data.toc;
				deferred.resolve();
			})
            .error(function(status) {
				console.log("error getting toc, status: " + status);
			});

		return deferred.promise;
	}

	// status in function is witch insert option that is clicked, preserve will be used to make sure it is not toggeling the open/close state, but will always have it open
	$scope.insertOptionChosen = function(status, preserve) {
		$scope.activeInsertOption = ((status != $scope.activeInsertOption || preserve) ? status : null);
        $scope.focusEditor();
    }

	$scope.insertImageOption = function(imageoption) {
		if ($scope.activeImageOption === imageoption) {
			$scope.activeImageOption = null;
        } else {
            $scope.activeImageOption = imageoption;
        }

        $scope.focusEditor();
    }

    $scope.finalizeOptionChosen = function(finalizeOption) {
        if ($scope.activeFinalizeOption === finalizeOption) {
            $scope.activeFinalizeOption = null;
        } else {
            $scope.activeFinalizeOption = finalizeOption;
        }

        $scope.focusEditor();
    }

    $scope.scrollToToc = function(tocEntry) {
        var elm = $rootScope.ck.document.$.getElementById(tocEntry.id);
        if (elm) {
			elm.scrollIntoView();
		}
	}

    $scope.anchorScrollTo = function(tocEntry) {
		var re = /\_(.*?)\./;
		var documentId = tocEntry.target.match(re)[1];

        if (documentId !== $scope.documentSelected._id) {
            angular.forEach($scope.projectDocuments, function(document) {
                if (document._id === documentId) {
                    $scope.openProjectDocument(document);
				}
			});
		}

		//if the document is not opened we expect scrollToToc fail here
		//after document is opened CK will trigger renderFinished event
		//and will trigger scrollToToc to lastTocEntry
        if (tocEntry.type !== 'document') {
            $scope.scrollToToc(tocEntry);
			$scope.lastTocEntry = tocEntry;
		}
	};

	$scope.insertNewAnchor = function(){
		var id = 'id_' + Date.now();
		var type = "anchor";
		var insert = '<a id="' + id + '" title="title"></a>';
		editorInsert( insert, type );
		$scope.updateProjectDocument();
		$scope.getToc();
		$scope.anchorName = '';
	}

	$scope.insertNewLink = function() {
		var type = "link";
		var link = '<a href="' + $scope.linkAddress + '">link_text</a>';
		editorInsert( link, type);
		$scope.updateProjectDocument();
		$scope.linkAddress = '';
		$scope.linkText = '';
		$scope.linkAnchor = '';
	}

    $scope.insertNewImage = function(image) {
        insertImage(image);
	}

	function constructImageTag(image) {
		var imageTag = '<figure><img src="//' + $location.host() + '/project/' + $scope.pid + '/images/' + image.name + '" /></figure>';
		return imageTag;
	}

	function constructCoverTag(image){
		var imageTag = '<img class="cover" src="//' + $location.host() + '/project/' + $scope.pid + '/images/' + image.name + '" />';
		return imageTag;
	}

	function insertImage( image ) {
		var type="image";
		var imageInsert = constructImageTag( image );
		editorInsert( imageInsert, type );
	}

    function overwriteExistingDocument(type, text) {
		var isNew = true;
        for (var i = 0; i < $scope.projectDocuments.length; i++) { 
            var document = $scope.projectDocuments[i]; 
            if (typeof document.type !== 'undefined') {
                if (document.type === type) {

					// Check if the document is archieved and activate it, TODO: refactore to only make the check if document is archieved
                    var waitPromise = $scope.unarchiveProjectDocument(document);
                    waitPromise.then(function() {
						$scope.documentSelected.text = text;
					});

					isNew = false;
					break;
				}
			}
		}

		return isNew;
	}
	
    $scope.createCover = function(image) {
		var html = constructCoverTag( image );
		var isNewCover = overwriteExistingDocument( 'cover', html );
        if (isNewCover) {
            $scope.addProjectDocument('cover', html);
		} else {
			$scope.showLeftMenu('contents', true);
		}
		var json = {};
		json.cover = 'images/' + image.name;
        $http.put('/project/' + $scope.pid + '/metadata/cover', angular.toJson(json));
	}

	function generateTocHtml() {
		var tocHtml = '<h2>Contents</h2>';

        for (var i = 0; i < $scope.toc.length; i++) {
			var level = $scope.toc[i].level + 1;
            var tocHtml = tocHtml + '<p class="toc-item-h' + level + '"><a href="' + $scope.toc[i].target + '">' + $scope.toc[i].text + '</a><br /></p>';
		}

		return tocHtml;
	}

	$scope.generateToc = function() {
		var html = generateTocHtml();
        var isNewToc = overwriteExistingDocument('toc', html);

        if (isNewToc) {
            $scope.addProjectDocument('toc', html);
		} else {
			$scope.showLeftMenu('contents', true);
		}

		$scope.setToc();
	}

	$scope.setToc = function() {
		var deferred = $q.defer();
		var data = {};
		data.entries = $scope.toc;
        $http.put('/project/' + $scope.pid + '/toc', angular.toJson(data))
            .success(function(data) {
				deferred.resolve();
			})
            .error(function(status) { 
			});

		return deferred.promise;
	}

	function generateTitlePageHtml() {
		var title = '<p class="titlepageTitle">' + $scope.project.name + '</p>';
		var author = '<p class="titlepageAuthor">by ' + $scope.user.firstname + ' ' + $scope.user.lastname + '</p>'
		var pageBreak = '<p class="empty-paragraph">&nbsp;<br /></p>';
		var link = '<p contenteditable="false"><a href="http://www.scripler.com"><img class="logo" src="stylesets/Images/builtwithscripler.svg" /></a></p>';
		return title + author + pageBreak + pageBreak + pageBreak + link;
	}

	$scope.generateTitlePage = function() {
		var html = generateTitlePageHtml();
        var isNewTitlePage = overwriteExistingDocument('titlepage', html);

        if (isNewTitlePage) {
            $scope.addProjectDocument('titlepage', html);
		} else {
			$scope.showLeftMenu('contents', true);
		}
	}

	function generateColophonHtml() {
		var title = '<h4 class="right">' + $scope.project.name + '</h4>';
		var author = '<p class="colophon">' + $scope.user.firstname + ' ' + $scope.user.lastname + '</p>'
		var pageBreak = '<p class="empty-paragraph">&nbsp;<br /></p>';
		var isbn = '<p class="colophon">ISBN: [ISBN-nr.]</p>';
		var link = '<p class="colophon" contenteditable="false">Built with <a class="link" href="http://www.scripler.com">Scripler</a></p>';
		return title + pageBreak + author + pageBreak + isbn + pageBreak + link;
	}

	$scope.generateColophon = function() {
		var html = generateColophonHtml();
        var isNewColophon = overwriteExistingDocument('colophon', html);

        if (isNewColophon) {
            $scope.addProjectDocument('colophon', html);
		} else {
			$scope.showLeftMenu('contents', true);
		}
	}

	// returns content that is selected in the caret
	function returnSelectedContent(){
		var editor = getEditor();
		var selection = editor.getSelection();
		var selectedContent;
		var range;
	
		// "selectedContent" is used in another function, therefore we need to return it
		// however, it is buggy for updating the anchors / hyperlinks input fields...
		// for Chrome, the fix is in the 'onselectionchange' function, but that is not supported
		// by Firefox, therefore we still update with "selectedContent" there, until I find a further fix

		if(selection){
			selectedContent = selection.getSelectedText();
		}

		// get the iframe document
		var iframeDoc = document.getElementsByClassName("cke_wysiwyg_frame")[0].contentDocument;

		iframeDoc.onselectionchange = OnChange;
        function OnChange () {
            range = iframeDoc.getSelection().toString();
           	document.getElementById("anchorInputBox").value = range;
           	document.getElementById("hyperlinkInputBox").value = range;
           	document.getElementById("hyperlinkTarget").value = "";
		}

        // onselectionchange doesn't work for Firefox, so instead we update with the old selectedContent returned by CKEditor
        if(navigator.userAgent.search("Firefox")>-1){
        	document.getElementById("anchorInputBox").value = selectedContent;
           	document.getElementById("hyperlinkInputBox").value = selectedContent;
           	document.getElementById("hyperlinkTarget").value = "";
		}

		return selectedContent;
	}

	function editorInsert( insert, type ) {
		var anchorInputContent = document.getElementById("anchorInputBox").value;
		var hyperlinkInputContent = document.getElementById("hyperlinkInputBox").value;

		var editor = getEditor();
		var selectedContentRequired = (type == "anchor" || type == "link"); 
		var selectedContent = returnSelectedContent();
		var validURL = true;

		// if there is no selected content on the caret, take content from the anchor/hyperlink input box
		if(selectedContent == "" && selectedContentRequired){
			if(type == "anchor" && anchorInputContent != ""){
				selectedContent = anchorInputContent;
			}
				
			else if(type=="link" && hyperlinkInputContent!=""){
				selectedContent = hyperlinkInputContent;
			}		
		}

		// defaulting the title/name of the anchor and the text of the hyperlink to the selected content
		var title = selectedContent;
		
		// if the anchor/hyperlink input field is not empty, then add the element
		if(!selectedContentRequired || selectedContent!=""){
			if(type == "anchor"){
				if($scope.anchorName){
					title=$scope.anchorName;
				}

				insert = insert.replace('title="title"', 'title="' + title + '"');
				var replacedContent = $rootScope.CKEDITOR.dom.element.createFromHtml(selectedContent);
			}
			else if(type == "link"){
				if($scope.linkText){
					title = $scope.linkText;
				}
				insert = insert.replace('link_text', title);

				var regExpValidUrl = /^((https?):\/\/)?([w|W]{3}\.)+[a-zA-Z0-9\-\.]{3,}\.[a-zA-Z]{2,}(\.[a-zA-Z]{2,})?$/;
				validURL = !($scope.internal != true && !regExpValidUrl.test($scope.linkAddress));
			}	

			//create and insert anchor/hyperlink element on the caret
			if(validURL){
				var element = $rootScope.CKEDITOR.dom.element.createFromHtml(insert);
				editor.insertElement(element);
			}

			// keep the old content of the anchor
			if(type == "anchor"){
				editor.insertText(replacedContent.getText());
			}

			if (type == "image"){
				// move cursor to current position
				var range = editor.createRange();
				var imageRangeChange = range.startContainer;
				range.moveToElementEditablePosition(imageRangeChange, true);
			}

			$scope.focusEditor();
			$scope.updateProjectDocument();
		} else {
				// if the field is empty, do not do anything
		}
	}


    $scope.$watch('linkAnchor', function(newValue, oldValue) {
    	var hasText = false;
    	if(hyperlinkInputBox.value!=""){
    			hasText = true;
    	}
        if (newValue !== oldValue) {
			$scope.linkAddress = newValue.target;
			$scope.internal = true;
			
			if(!hasText){
				$scope.linkText = newValue.text;
			}
		} else { 
			$scope.internal = false;
		}

		$scope.focusEditor();
	});

	function getEditor(scope) {
		return $rootScope.CKEDITOR.instances.bodyeditor;
	}

    $scope.$onRootScope('ckDocument:dataReady', function(event) {
		if ($scope.ck.resetUndo && resetUndoHistory) {
			$scope.ck.resetUndo();
			resetUndoHistory = false;
		}
	});
    $scope.$onRootScope('ckDocument:ready', function(event) {
		$scope.ckReady = true;
		$scope.loadFonts();
	});
    $scope.$onRootScope('ckDocument:renderFinished', function(event) {
        if (typeof $scope.lastTocEntry !== 'undefined') {
            $scope.scrollToToc($scope.lastTocEntry);
		}
	});
    $scope.$onRootScope('ckDocument:dataReady', function(event) {
        if (typeof $scope.ckReady !== 'undefined') {
            if ($scope.ckReady) {
                $scope.applyStylesetsToEditor();
                $scope.focusEditor();
            }
        }
    });

    angular.element(document).ready(function() {

		$scope.showStyleEditor = function() {
            if ($scope.styleEditorVisible) {
				$scope.hideStyleEditor();
			} else {
				var registrationWrapperHeight = document.getElementById('registrationWrapper').offsetHeight;
				$rootScope.ck.commands.showFloatingTools.exec(registrationWrapperHeight);
				$scope.styleEditorVisible = true;
			}
		}

		$scope.hideStyleEditor = function() {
            if ($scope.styleEditorVisible) {
				$rootScope.ck.commands.hideFloatingTools.exec();
				$scope.styleEditorVisible = false;
			}
		}

		$scope.insertPageBreak = function() {
			$rootScope.ck.commands.pagebreak.exec();
		}
		$scope.insertPageBreakAvoid = function() {
			$rootScope.ck.commands.pagebreakavoid.exec();
		}

		var editor = getEditor();
		editor.on( 'selectionChange', function( ev ) {
			if ( typeof $scope.stylesets != 'undefined') {
				var elementPath = ev.data.path;
				var elements = elementPath.elements;
				var isSet = false;
				var stylesets = $scope.stylesets;
				var selectedStyle = {};
				$scope.copyCSS = false;

				// For each element into the elements path.
				for ( var i = 0, count = elements.length, element; i < count; i++ ) {
					element = elements[ i ];

					if ( element.getName() === 'body' ) {
						break;
					}

					var content = "";
					var target = "";
					if( element.getName() === "a" ){
						target = element.getAttribute("href");
						if(target=="undefined")target="";

						// fetching content of anchor
						content = element.$.innerHTML;

						document.getElementById("hyperlinkInputBox").value = content;
						document.getElementById("hyperlinkTarget").value = target;

						return false;
					}
					

					for ( var x = 0; x < stylesets.length; x++ ) {
						var styles = stylesets[x].styles;

						if ( element.hasAttribute( 'class' ) ) {
							var eClass = element.getAttribute( 'class' );
						}

						if ( typeof eClass != 'undefined' && eClass !== 'empty-paragraph' ) {
							for ( var p = 0; p < styles.length; p++ ) {
								var sClass = styles[p].class;
								var nonDefaultClass = 'style-' + styles[p]._id;
								if ( eClass === sClass || eClass === nonDefaultClass ) {
									selectedStyle = styles[p];
									isSet = true;
									//break all loops
									p = styles.length;
									x = stylesets.length;
									i = elements.length;
								}
							}
						} else {
							//check for tag
							var tag = element.getName();
							for ( var y = 0; y < styles.length; y++ ) {
								var sTag = styles[y].tag;
								if ( tag === sTag && stylesets[x]._id === $scope.documentSelected.defaultStyleset ) {
									selectedStyle = styles[y];
									isSet = true;
									//break all loops
									y = styles.length;
									x = stylesets.length;
									i = elements.length;
								}
							}
						}
					}
				}

				//logic for copying styles when css has been changed
				if ( elements.length > 0 ) {
					var element = elements[0];

					if ( element.hasAttribute( 'style' ) || element.is( 'em' ) || element.is('strong') || element.is('u') ||
						 element.is('s') ) {
						$scope.copyCSS = true;
					}
				}

                // Scroll to the selected style
                if (!$scope.selectedStyle || $scope.selectedStyle._id != selectedStyle._id || $scope.selectedStyle.scroll) {
					$scope.selectedStyle = selectedStyle;
					$scope.selectedStyle.scroll = false;
					$scope.scrollToStyle();
                }
			}

			returnSelectedContent();

		}, this );

        $scope.scrollToStyle = function() {

			if ($scope.leftMenuShowItem == 'design') {

				var styleNode = document.getElementById( $scope.selectedStyle._id );
                // The list-item dom-node reprenseting the parent styleset
                var stylesetNode = styleNode.parentNode.parentNode;
                // The container for all the stylesets, which is the scrolling container
                var stylesetsContainer = document.getElementById('menu-left-design');

                var alreadyExpanded = angular.element(stylesetNode).scope().typoChildrenVisible;
                var animationTime = 700;

                // If the styleset is already expanded, we don't wait additional time before setting the selected style in the angular scope.
                var waitBeforeExpand = alreadyExpanded ? 0 : 300;

                // Do the actual scrolling
                smoothScroll.animateScroll(null, '#' + stylesetNode.id, { updateURL: false, speed: animationTime, easing: 'easeInCubic' }, stylesetsContainer);

                // Update angular scope after the animation is done
                setTimeout(function () {
                    angular.element(stylesetNode).scope().typoChildrenVisible = true;
                    if ( !$scope.$$phase ) {
                        $scope.$apply();
                    }
                }, animationTime + waitBeforeExpand);
            }
        };

        //editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+startChapter.documentstyleSheet+'.css';
        //      var startChapter = $scope.documents[0];
        //      $scope.entrybody = startChapter.content;
	    // Mangler at tilf??je stylen startChapter.documentstyleSheet
		//editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+startChapter.documentstyleSheet+'.css';

		// CK Editor Controls
        $scope.projectDocumentChosen = function(projectDocument) {
            $scope.openProjectDocument(projectDocument);

			//$scope.ckEditorContent = projectDocument.styleSheet;
			//Change to use the script settings and load content there
			//editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+projectDocument.styleSheet+'.css';
		};

        $scope.changeStyle = function(name) {
			if (editor) {
                editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/' + name + '.css';
            } else {
				console.log('error: no editor found')
			}
	    };

	});
}
