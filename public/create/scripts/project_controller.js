'use strict'

function projectController( $scope, $location, userService, projectsService, $http ) {

	$scope.testName = 'Documents Test';
	$scope.sortable_option = {

	stop : function( list, drop_item ) {
		console.log(list);
		//call reorder
		}
	};

	// Scope, Project
	$scope.projectDocuments = [
		//ADD/FIX: Get Publications API Call, on success do change
		{number:'00001',name:'Document 1',content:'<h1>this is a test</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'bookbw'},
		{number:'00002',name:'Document 2',content:'<h1>this is a test 2</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'bookbw'},
		{number:'00003',name:'Document 3',content:'<h1>this is a test 3</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'futurebw'},
		{number:'00004',name:'Document 4',content:'<h1>this is a test 4</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'futurebw'},
		{number:'00005',name:'Document 5',content:'<h1>this is a test 5</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'pleasantbw'},
		{number:'00006',name:'Document 6',content:'<h1>this is a test 6</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'pleasantbw'},
		{number:'00007',name:'Document 7',content:'<h1>this is a test 7</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'bookbw'},
		{number:'00008',name:'Document 8',content:'<h1>this is a test 8</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',styleSheet:'bookbw'}
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

	$scope.addProjectDocument = function() {
		var order = $scope.projectDocuments.length + 1;
		var name = "Document " + order;
		var document = {};
		document.name = name;

		if ( $scope.user._id ) {
			document.projectId = $scope.pid;
			$http.post('/document', angular.toJson( document ) )
				.success( function( data ) {
					$scope.projectDocuments.push( data.document );
				})
		} else {
			$scope.projectDocuments.push( document );
		}
	}

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

	function initiateMenus() {
		// Variables
		var menuLeft = document.getElementById("menu-left");
		var menuRight = document.getElementById("menu-right");

		// Functions
		function screenHeight() {
			var w = window,
		    d = document,
		    e = d.documentElement || d.body,
		    //g = d.getElementsByTagName('body')[0],
		    //x = w.innerWidth || e.clientWidth || g.clientWidth,
		    y = w.innerHeight|| e.clientHeight;// || g.clientHeight;

		    return y;
		};

		//menuLeft.style.height = screenHeight()-80 + "px";
		/*menuRight.style.height = screenHeight() + "px";

		var menuLeftContent = document.getElementById('menu-left-content');
		menuLeftContent.style.height = screenHeight()-73 + "px";

		var menuLeftTabs = document.getElementById('menu-left-tabs');
		menuLeftTabs.style.height = 66 + 'px';

		var menuLeftTab = document.getElementsByClassName( 'menu-left-tab' );
		menuLeftTab[0].style.width = screenHeight() / 3  + 'px';
		menuLeftTab[1].style.width = screenHeight() / 3  + 'px';
		menuLeftTab[2].style.width = screenHeight() / 3  + 'px';*/

	}

    function initiateEditor(scope) {
    	$scope.ckContent = 'test';

//		var startChapter = $scope.documents[0];
//		$scope.entrybody = startChapter.content;
		// Mangler at tilføje stylen startChapter.documentstyleSheet
    }

    initiateEditor();
    initiateMenus();

	angular.element(document).ready(function () {



		//editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+startChapter.documentstyleSheet+'.css';

//	    var startChapter = $scope.documents[0];
//	    $scope.entrybody = startChapter.content;
	    // Mangler at tilføje stylen startChapter.documentstyleSheet
		//editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+startChapter.documentstyleSheet+'.css';

		// CK Editor Controls
	    $scope.projectDocumentChoosen = function( projectDocument ) {
			if (editor) {
				$scope.entrybody = projectDocument.content;
				$scope.entrybodyStyleset = projectDocument.styleSheet;
				//Change to use the script settings and load content there
				editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+projectDocument.styleSheet+'.css';
			}
			else {
				console.log('error: no editor found')
			}
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
