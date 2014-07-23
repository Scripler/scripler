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

	$scope.fonts = [];

	if ( $scope.user === 'undefined' ) {
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
				$scope.applyStylesetsToEditor();
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

			data.documents = documentIds;

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

				if ( !$scope.documentWatch ) {
					$scope.$watch('documentSelected', $scope.saveProjectDocumentUpdates, true);
					$scope.documentWatch = true;
				}

				if ( typeof $scope.ckReady == 'boolean' ) {
					if ( $scope.ckReady ) {
						$scope.applyStylesetsToEditor();
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
		//document gets copied because changing document text model will reload CK editor
		var document = angular.copy( $scope.documentSelected );
		document.text = $rootScope.CKEDITOR.instances.bodyeditor.getData();
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
		var index = $scope.projectDocuments.indexOf( projectDocument );
		if ( $scope.user._id ) {
			$http.put('/document/' + projectDocument._id + '/archive')
				.success( function() {
					projectDocument.archived = true;
					$scope.openProjectDocument( $scope.projectDocuments[index+1] );
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
		var deferred = $q.defer();

		$http.get('/document/' + projectDocument._id + '/stylesets')
			.success( function( data ) {
				$scope.stylesets = data.stylesets;
				deferred.resolve();
			});

		return deferred.promise;
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
				data.styleset.rename = true;
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
		var index = $scope.stylesets.indexOf( styleset );

		$http.put('/styleset/' + styleset._id + '/document/' + $scope.documentSelected._id)
			.success( function( data ) {
				if ( data.styleset ) {
					$scope.stylesets[ index ] = data.styleset;
					$scope.documentSelected.defaultStyleset = data.styleset._id;
					deferred.resolve( data.styleset );
					$scope.applyStylesetsToEditor();
				} else {
					deferred.resolve( styleset );
				}
			});

		return deferred.promise;
	}

	$scope.applyDefaultStyleset = function() {
		var deferred = $q.defer();

		$http.get('/styleset/' + $scope.documentSelected.defaultStyleset )
			.success( function( data ) {
				$scope.defaultStyleset = data.styleset;
				deferred.resolve( data.styleset );
				//$scope.applyStylesetToEditor( data.styleset, true );
			});

		return deferred.promise;
	}

	$scope.applyStylesetToEditor = function( styleset, isDefault ) {

		$scope.currentStylesetCSS = stylesetUtilsService.getStylesetContents( styleset, isDefault );

		if ( $scope.ckReady ) {
			$rootScope.ck.document.appendStyleText( $scope.currentStylesetCSS );
		}
	}

	$scope.applyStylesetsToEditor = function() {
		if ( typeof $scope.stylesets == 'undefined' ) {
			var promise = $scope.openStylesets( $scope.documentSelected );

			promise.then( function() {
				applyStylesets();
			});
		} else {
			applyStylesets();
		}
	}

	var applyStylesets = function() {
		var combinedCSS = '';
		for ( var i = 0; i < $scope.stylesets.length; i++ ) {
			if ( $scope.documentSelected.defaultStyleset == $scope.stylesets[i]._id ) {
				combinedCSS += stylesetUtilsService.getStylesetContents( $scope.stylesets[i], true );
			} else {
				combinedCSS += stylesetUtilsService.getStylesetContents( $scope.stylesets[i], false );
			}
		}

		if ( combinedCSS != '' ) {
			if ( typeof $scope.cssStyling == 'undefined' ) {
				var ckDocument = $rootScope.ck.document;
				var style = new CKEDITOR.dom.element( 'style' );
				$scope.cssText = new CKEDITOR.dom.text( combinedCSS );
				style.append( $scope.cssText );
				ckDocument.getHead().append( style );
				$scope.cssStyling = style;
			} else {
				var newStyle = new CKEDITOR.dom.text( combinedCSS );
				newStyle.replace( $scope.cssText );
				$scope.cssText = newStyle;
			}
		}
	}

	$scope.applyStyle = function( styleset, style ) {
		var styleIndex = styleset.styles.indexOf( style );

		var editor = $rootScope.CKEDITOR.instances.bodyeditor;

		var isDefault = styleset._id === $scope.documentSelected.defaultStyleset;

		//when applying styleset to document, the styles get copied to new (document) styleset
		if ( style._id != styleset.styles[styleIndex]._id ) {
			style = styleset.styles[styleIndex];
		}

		var selection = $rootScope.ck.getSelection();
		var selectedRanges = selection.getRanges();
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
					$scope.applyStyleToElement( firstElement, style, isDefault );
				} else {
					var applyToParent = false;
					applyToParent = $scope.applyToSelectionWalker( editor, style, isDefault );

					//!!!this is done after the walker because it messes up the selection if done inside the walker
					if ( applyToParent ) {
						$scope.applyStyleToElement( firstElement, style, isDefault );
					}
				}
			}
		}

		$scope.applyStylesetsToEditor();

		$scope.updateProjectDocument();

		$scope.selectedStyle = style;

		$rootScope.ck.focus();
		selection.selectRanges( selectedRanges );
	}

	$scope.isBlock = function( style ) {

		if ( isBlockHelper( style ) ) {
			return 'character';
		}

		return 'block';
	}

	var isBlockHelper = function( style ) {
		try {
			var lineHeight = typeof style.css['line-height'];
			var margin = typeof style.css['margin'];
			var padding = typeof style.css['padding'];
		} catch (e) {
			//silence exception if value is undefined
			//only used to determine if style is block or character
		}

			if ( lineHeight == 'undefined' &&
				 margin == 'undefined' &&
				 padding == 'undefined' ) {
					return true;
			}

		return false;
	}

	$scope.applyCharStyleToElement = function( style, isDefault ) {
		if ( isDefault ) {
			$rootScope.ck.applyStyle( new CKEDITOR.style( {
				element : style.tag
			}));
		} else {
			$rootScope.ck.applyStyle( new CKEDITOR.style( {
				element : style.tag,
				attributes : { class : 'style-' + style._id }
			}));
		}
	}

	$scope.applyStyleToElement = function( element, style, isDefault ) {

		if ( typeof style.tag != 'undefined' ) {
			element.removeAttribute( 'class' );
			element.renameNode( style.tag );
		}

		if ( isDefault ) {
			if ( typeof style.class != 'undefined' ) {
				element.addClass( style.class );
			}
		} else {
			element.addClass( 'style-' + style._id );
		}

	}

	$scope.applyToSelectionWalker = function( editor, style, isDefault ) {

		//apply on selection or multiple blocks
		var range = editor.getSelection().getRanges();
		var walker = new CKEDITOR.dom.walker( range[0] ), node;
		var isNotWhitespace = CKEDITOR.dom.walker.whitespaces( true );
		var applyToParent = false;
		var counter = 0;
		var endNode = range[0].endContainer;

		walker.guard = function( node, isMoveout )
		{
			if ( counter != 0 &&
				node.$.nodeName === endNode.$.nodeName &&
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
					$scope.applyStyleToElement( node, style, isDefault );
				}
			}

			counter++;
		}

		return applyToParent;
	}

	$scope.addNewStyle = function( styleset, style, index ) {
		var newStyle = {};

		if ( typeof style !== 'undefined' ) {
			newStyle = style;
		}

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

		newStyle.name = 'Style ' + number;
		newStyle.stylesetId = styleset._id;

		if ( typeof newStyle.css == 'undefined' ) {
			newStyle.css = getStyleCSS();
		}

		$http.post('/style', angular.toJson( newStyle ) )
			.success( function( data ) {
				var style = data.style

				style.class = "style-" + style._id;
				$scope.updateStyle( style );

				if ( index > -1 ) {
					styleset.styles.splice( index+1, 0, style );
				} else {
					styleset.styles.push( style );
				}
				style.rename = true;
			});
	}

	$scope.updateStyle = function( style ) {
		$http.put('/style/' + style._id + '/update', angular.toJson( style ) );
	}

	$scope.archiveStyle = function( style ) {
		$http.put('/style/' + style._id + '/archive')
			.success( function( data ) {
				style.archived = true;
			});
	}

	function getStyle( el, styleProp )
	{
		if ( el.currentStyle )
			var y = el.currentStyle[styleProp];
		else if ( window.getComputedStyle )
			var y = document.defaultView.getComputedStyle( el, null ).getPropertyValue( styleProp );
		return y;
	}

	function getStyles( element, styles, activeCSS ) {
		styles.forEach(function( style ) {
			var cssStyle = getStyle(element.$, style);
			if ( cssStyle !== "" && cssStyle !== null ) {
				activeCSS[style] = cssStyle;
			}
		});

		return activeCSS;
	}

	function getStyleCSS() {
		var selection = $rootScope.ck.getSelection();
		var element = selection.getStartElement();

		var styles = [ 'font-size', 'font-family', 'font-weight', 'font-style', 'color', 'text-decoration',
					  'margin', 'padding', 'line-height', 'hyphens', 'page-break-inside', 'quotes', 'border',
					  'text-indent', 'background-color', 'list-style' ];
		var activeCSS = {};
		activeCSS = getStyles( element, styles, activeCSS );

		return activeCSS;
	}

	$scope.saveAsCharStyle = function( styleset, style ) {
		var selection = $rootScope.ck.getSelection();
		var element = selection.getStartElement();
		var inlineCSS = {};
		var index = styleset.styles.indexOf( style );

		if ( element.hasAttribute( 'style' ) ) {
			var styleAttributes = element.getAttribute( 'style' );

			var matches = styleAttributes.match( /([\w-]+)\s*:\s*([^;]+)\s*;?/ );

			for ( var x = 0; x < matches.length; x++ ) {
				if ( x % 3 !== 0 ) {
					if ( [ 'margin', 'padding', 'line-height', 'margin-top', 'margin-bottom', 'margin-right',
							'margin-left', 'padding-top', 'padding-bottom', 'padding-right', 'padding-left' ].indexOf( matches[x] ) < -1 ) {
						inlineCSS[matches[x]] = matches[x+1];
						x++; //skip next one because it has been assigned
					}
				}
			}
		}

		var styles = [ 'font-weight', 'font-style', 'text-decoration' ];
		inlineCSS = getStyles( element, styles, inlineCSS );

		var style = {};
		style.css = inlineCSS;

		$scope.addNewStyle( styleset, style, index );
	}

	$scope.toggleRename = function( obj ) {
		obj.rename = !obj.rename;
	}

	$scope.isDefaultStyleset = function( styleset ) {
		return styleset._id === $scope.documentSelected.defaultStyleset;
	}

	$scope.saveAsBlockStyle = function( styleset, style ) {
		var index = styleset.styles.indexOf( style );
		var newStyle = angular.copy( style );
		newStyle.css = getStyleCSS();

		$scope.addNewStyle( styleset, newStyle, index );
	}

	$scope.overrideStyle = function( style ) {
		var activeCSS = getStyleCSS();

		var newStyle = angular.copy( style );
		newStyle.css = activeCSS;

		$scope.updateStyle( newStyle );
	}

	$scope.setStylesetStyling = function( styleset, style ) {
		var stylesetCSS = style.css;
		stylesetCSS[ 'padding' ] = '15px 0 15px 10px';
		stylesetCSS[ 'font-size' ] = '1.5em';
		var family = stylesetCSS['font-family'];
		var fontStyle = stylesetCSS['font-style'];
		var weight = stylesetCSS['font-weight'];
		delete stylesetCSS[ 'margin' ];
		delete stylesetCSS[ 'line-height' ];

		var font = family.split(',')[0];
		font = font.replace(/"/g, '');
		var fs = 'n';

		if ( fontStyle === 'italic' ) {
			fs = 'i';
		}
		if ( fontStyle === 'oblique' ) {
			fs = 'o';
		}

		font = '"' + font + ':' + fs + weight/100 + '"';
		$scope.fonts.push( font );

		styleset.css = stylesetCSS;
	}

	$scope.loadFonts = function() {
		WebFont.load({
			custom: {
				families: $scope.fonts,
				urls: ['stylesets/non-editable.css']
			}
		});
	}

	$scope.generateToc = function() {
		$http.get('/project/' + $scope.project._id + '/toc')
			.success( function( data ) {
				console.log(data);
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
		$scope.applyStylesetsToEditor();
		$scope.loadFonts();
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

		var editor = $rootScope.CKEDITOR.instances.bodyeditor;
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

				//if selected style was not set, remove active selection
				if ( !isSet ) {
					selectedStyle = {};
				}

				if ( !$scope.$$phase ) {
					$scope.$apply(function() {
						$scope.selectedStyle = selectedStyle;
						var elm = document.getElementById( selectedStyle._id );
						if ( elm ) {
							elm.scrollIntoView();
						}

					});
				}

			}

		}, this );

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
