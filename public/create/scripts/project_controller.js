'use strict'

function projectController( $scope, $location, userService, projectsService, $http ) {

	// Scope, Project
	$scope.chapters = [
        //ADD/FIX: Get Publications API Call, on success do change
        {chapterNumber:'00001',name:'Document 1',chapterContent:'<h1>this is a test</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',chapterStyleSheet:'bookbw'},
        {chapterNumber:'00002',name:'Document 2',chapterContent:'<h1>this is a test 2</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',chapterStyleSheet:'bookbw'},
        {chapterNumber:'00003',name:'Document 3',chapterContent:'<h1>this is a test 3</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',chapterStyleSheet:'futurebw'},
        {chapterNumber:'00004',name:'Document 4',chapterContent:'<h1>this is a test 4</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',chapterStyleSheet:'futurebw'},
        {chapterNumber:'00005',name:'Document 5',chapterContent:'<h1>this is a test 5</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',chapterStyleSheet:'pleasantbw'},
        {chapterNumber:'00006',name:'Document 6',chapterContent:'<h1>this is a test 6</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',chapterStyleSheet:'pleasantbw'},
        {chapterNumber:'00007',name:'Document 7',chapterContent:'<h1>this is a test 7</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',chapterStyleSheet:'bookbw'},
        {chapterNumber:'00008',name:'Document 8',chapterContent:'<h1>this is a test 8</h1><p>First line of text</p><h2>this is a test</h2><p>Second line of text</p><h3>this is a test</h3><p>Third line of text</p>',chapterStyleSheet:'bookbw'}
    ];

	$scope.$on('user:updated', function( event, user ) {
		$scope.user = user;
		$scope.pid = ($location.search()).pid;

		var projectPromise = projectsService.getProject( $scope.pid );
		projectPromise.then( function( project ) {
			$scope.project = project;
			$scope.chapters = $scope.project.documents;
		});
	});

	$scope.addDocument = function() {
		var order = $scope.chapters.length + 1;
		var name = "Document " + order;
		var document = {};
		document.name = name;

		if ( $scope.user._id ) {
			document.projectId = $scope.pid;
			$http.post('/document', angular.toJson( document ) )
				.success( function( data ) {
					$scope.chapters.push( data.document );
				})
		} else {
			$scope.chapters.push( document );
		}
	}

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

		// Menu Controls
		var elements = document.getElementsByClassName('menu-item-left');

		for (var i = 0; i < elements.length; i++) {
		    elements[i].addEventListener('click', function(e) {
		    	//e.stopPropagation();

		    	if (this.className == 'menu-item-left closed') {
		    		elements[0].className = 'menu-item-left closed';
		    		elements[1].className = 'menu-item-left closed';
		    		elements[2].className = 'menu-item-left closed';
		    		this.className = 'menu-item-left open';
		    	}
		    	else {
		    		this.className = 'menu-item-left closed';
		    		//elements[0].className = 'menu-item-left open';
		    	}
		    }, false);
		};

		var elementsChildren = document.getElementsByClassName('menu-content');

		for (var i = 0; i < elements.length; i++) {
		    elementsChildren[i].addEventListener('click', function(e) {
		    	e.stopPropagation();
		    }, false);
		};

		menuLeft.style.height = screenHeight() + "px";
		menuRight.style.height = screenHeight() + "px";

		var menuLeftShowhide = document.getElementById('menu-left-showhide');
		menuLeftShowhide.style.width = screenHeight() / 3 + "px";

		var menuLeftTabs = document.getElementById( 'menu-left-tabs' );
		angular.element( menuLeftTabs ).css( 'top', screenHeight() / 3 + 'px' );

		menuLeftShowhide.onclick = function() {
		  if (menuLeft.className.match(/(?:^|\s)open(?!\S)/) ) {
		    menuLeft.className = "menu-left";
		  }
		  else {
		    menuLeft.className += " open";
		  }
		};

		document.getElementById('menu-right-showhide').onclick = function() {
		  if (menuRight.className.match(/(?:^|\s)open(?!\S)/) ) {
		    menuRight.className = "menu-right";
		  }
		  else {
		    menuRight.className += " open";
		  }
		};
    }

    function initiateEditor(scope) {
    	$scope.ckContent = 'test';

//		var startChapter = $scope.chapters[0];
//		$scope.entrybody = startChapter.chapterContent;
		// Mangler at tilføje stylen startChapter.chapterStyleSheet
    }

    initiateEditor();
    initiateMenus();

	angular.element(document).ready(function () {



		//editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+startChapter.chapterStyleSheet+'.css';

//	    var startChapter = $scope.chapters[0];
//	    $scope.entrybody = startChapter.chapterContent;
	    // Mangler at tilføje stylen startChapter.chapterStyleSheet
		//editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+startChapter.chapterStyleSheet+'.css';

		// CK Editor Controls
	    $scope.chapterChoosen = function(chapter) {
			if (editor) {
				$scope.entrybody = chapter.chapterContent;
				$scope.entrybodyStyleset = chapter.chapterStyleSheet;
				//Change to use the script settings and load content there
				editor.$.document.getElementsByTagName("link")[0].href = 'stylesets/'+chapter.chapterStyleSheet+'.css';
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
