CKEDITOR.plugins.add( 'scripler-customs', {
    init: function( editor ) {
        function isEmpty( node ) {
            var trimmed;
			if (node.getData) {
				trimmed = node.getData();
			} else {
				trimmed = node.getText();
			}
			trimmed = CKEDITOR.tools.ltrim(trimmed);
            if (trimmed && trimmed.length > 0) {
                //Paragraph contains some text, so not empty
                return false;
            }

            //Didn't identify any content, so should be empty
            return true;
        }
        
        function checkBlock(block) {
            if (block && block.is('p')) {
                if (isEmpty(block)) {
                    block.addClass('empty-paragraph');
                } else {
                    block.removeClass('empty-paragraph');
                }
            }
        }
        
        var changed = function () {
            if (editor.elementPath() && editor.elementPath().block) {
                // Check the block where the users cursor is currently located.
                checkBlock(editor.elementPath().block);
                // Check the previous block (maybe we just left it empty, while auto paragraphing to the next block)
                checkBlock(editor.elementPath().block.getPrevious());
            }
			
            //Reset change timer
            resetChangeTimeout();
        }; 
        
        // For any content check, check for empty paragraph.
        editor.on('change', changed);
        // Make sure that we identify an empty paragraph after auto-paragraphing.
        editor.on('selectionChange', changed);
        editor.on('elementsPathUpdate', changed);
		
		
        //editor.on('key', resetChangeTimeout);
        
        var toolbarObj;
		var editorObj;
		var inFocus = false;
		var fading = true;
		var op = 0.0;
		var timerFadeIn;
		var timerFadeOut;
		var timerChangeTimeout;
		
		function showToolbar() {
			resetChangeTimeout();
            fadeIn(toolbarObj);
		}
		
		function hideToolbar(force) {
			if (force) {
				clearInterval(timerFadeOut);
				clearInterval(timerFadeIn);
				fading = true;	
				toolbarObj.style.display = 'none';
				toolbarObj.style.opacity = 0.0;
				toolbarObj.style.filter = 'alpha(opacity=0)';
			} else if (!inFocus) {
				fadeOut(toolbarObj);
			}
		}
		
		function resetChangeTimeout() {
			//console.log('wow-'+Math.floor(Math.random()*101));
			if (timerChangeTimeout) {clearTimeout(timerChangeTimeout)};
			timerChangeTimeout = setTimeout(function(){fadeOut(toolbarObj)}, 5000);//5 seconds
		}
		
		function fadeOut(element) {
			if (!fading) {
				fading = true;
				var delay = 0;
				clearInterval(timerFadeIn);
				timerFadeOut = setInterval(function () {
					if (!delay) {
						if (op <= 0.1){
							clearInterval(timerFadeOut);
							element.style.display = 'none';
							op = 0.0;
						}
						element.style.opacity = op;
						element.style.filter = 'alpha(opacity=' + op * 100 + ')';
						op -= 0.1;
					} else {
						delay--;
					}
				}, 25);
			}
		}
		function fadeIn(element) {
			if (fading) {
				fading = false;
				var delay = 5;
				clearInterval(timerFadeOut);
				timerFadeIn = setInterval(function () {
					if (!delay) {
						if (op >= 1.0){
							clearInterval(timerFadeIn);
							op = 1.0;
							resetChangeTimeout();
						}
						element.style.opacity = op;
						element.style.filter = 'alpha(opacity=' + op * 100 + ")";
						element.style.display = 'block';
						op += 0.1;
					} else {
						delay--;
					}
				}, 25);
			}
		}
		
        // Hide/show toolbar
        editor.on('focus', function () {inFocus = true; showToolbar();});
		
        editor.on('paste', function (ev) {
            onPaste();
        
			//Identify empty paragraphs in pasted data
			//alert("Pasted 1");
			if (ev.data.dataValue) {
				ev.data.dataValue = ev.data.dataValue.replace(/(<p)(?![^>]*empty-paragraph)([^>]*?)(class\s*=\s*["']([^"']*)["']([^>]*))?(>(\s|&nbsp;)*<\/p>)/g, '$1$2 class="$4 empty-paragraph"$5$6');
			}
			//alert("Pasted 2");
            //var innerDocument = editor.$.document;
            
            var checkPasteDone = setInterval(function(){
                //alert('Readystate: ' + CKEDITOR.instances.editor1.window.$.document.readyState);
				var readyState = CKEDITOR.instances.editor1.window.$.document.readyState;
				console.log(readyState);
                if (!/in/.test(readyState) || readyState=="interactive") {
					document.getElementById('mask').style.display = 'none';
					clearInterval(checkPasteDone);
				}
            },100);
            //setInterval(function(){alert('Readystate: ' + CKEDITOR.instances.editor1.window.$.document.readyState);},5000);
		});
		
		var maskElm = document.getElementById('mask');
		var onPaste = function () {
			maskElm.style.display = 'block';
			console.log('Pasting...');
		}
        
        editor.on('blur', function () {inFocus = false; hideToolbar(true);});
        editor.on('instanceReady', function (event){
			//console.log(JSON.stringify(CKEDITOR.instances.editor1.window.$.document.getElementsByTagName("body")[0]));

			var editableBody = CKEDITOR.instances.bodyeditor.window.$.document.getElementsByTagName("body")[0]
			editableBody.addEventListener ("paste", onPaste, false);
			editableBody.addEventListener ("beforepaste", onPaste, false);
        
			var editorId = editor.id;
			toolbarObj = document.getElementById( editorId+'_top' );
			editorObj = document.getElementById( editorId+'_contents' );
            toolbarObj.style.display = 'none';
			//editorObj.onmousemove = showToolbar;
			editorObj.onmouseover = showToolbar;
			editorObj.onmouseout = function () {hideToolbar(false) };
			toolbarObj.onmouseover = showToolbar;
            editor.document.$.onmousemove = showToolbar;
            editor.document.$.onkeydown = showToolbar;
        });
    }
});