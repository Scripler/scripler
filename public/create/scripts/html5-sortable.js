/*
  Author:bachvtuan@gmail.com
  https://github.com/bachvtuan/html5-sortable-angularjs
  A directive that support sortable list via html5 for angularjs
  Read the readme.md and take a look at example code before using.
*/

var sortable_app = angular.module('html5.sortable', []);
sortable_app.directive('htmlSortable', function($parse,$timeout, $log, $window) {

  return {
    restrict: 'A',
    require: '?ngModel',
    scope: {
      htmlSortable: '=',
      ngModel : '=',
      ngExtraSortable:'='
    },

    //scope: true,   // optionally create a child scope
    link: function(scope, element, attrs,ngModel) {
      //var model = $parse(attrs.htmlSortable);
      /*attrs.html5Sortable*/

      var sortable = {};
      sortable.is_handle = false;
      sortable.in_use = false;
  	  var currentlyDraggingElement = null;
  	  var global_drop_index = 0;
  	  var global_drag_index = 0;

      sortable.handleDragStart = function(e) {

        $window['drag_source'] = null;
        $window['drag_source_extra'] = null;
		    currentlyDraggingElement = this;

        if ( sortable.options &&  !sortable.is_handle && sortable.options.handle ){
          e.preventDefault();
          return;
        }

        sortable.is_handle  = false;
        e.dataTransfer.effectAllowed = 'move';
        //Fixed on firefox
        e.dataTransfer.setData('text/plain', 'anything');

         $window['drag_source'] = this;
         $window['drag_source_extra'] = element.extra_data;

        // this/e.target is the source node.
        this.classList.add('moving');

        console.log('started dragging');
      };

      sortable.handleDragOver = function(e) {

		if (!currentlyDraggingElement) {
                return true;
        }

		if (e.preventDefault) {
          e.preventDefault(); // Allows us to drop.
        }

        e.dataTransfer.dropEffect = 'move';

        /*if ( !this.classList.contains('over') ){
          this.classList.add('over');
        }*/


        return false;
      };


      sortable.handleDragEnter = function(e) {

		if (!currentlyDraggingElement || currentlyDraggingElement === this) {
        	return true;
        }

        /*if ( !this.classList.contains('over') ){
          this.classList.add('over');
        }*/

		var drop_index = this.index;
		var drag_index = currentlyDraggingElement.index;

    console.log(drag_index);
    console.log(drop_index);


		global_drop_index = this.index;
		global_drag_index = currentlyDraggingElement.index;
    
    console.log(global_drag_index);
    console.log(global_drop_index);
    

		if (drop_index !== drag_index) {
			moveElementNextTo(currentlyDraggingElement, this);
		}


    console.log('finished dragging');
      };

	function moveElementNextTo(element, elementToMoveNextTo) {
        if (isBelow(element, elementToMoveNextTo)) {
            // Insert element before to elementToMoveNextTo.
			      elementToMoveNextTo.parentNode.insertBefore(element, elementToMoveNextTo);
            console.log('moved in front of its initial position');
        }
        else {
            // Insert element after to elementToMoveNextTo.
			      elementToMoveNextTo.parentNode.insertBefore(element, elementToMoveNextTo.nextSibling);
            console.log('moved behind its initial position');
        }
    }

    function isBelow(el1, el2) {
        var parent = el1.parentNode;
        if (el2.parentNode != parent) {
            return false;
        }

        var cur = el1.previousSibling;
        while (cur && cur.nodeType !== 9) {
            if (cur === el2) {
                return true;
            }
            cur = cur.previousSibling;
        }
        return false;
    }

      sortable.handleDragLeave = function(e) {
        // this.classList.remove('over');
      };

      sortable.handleDrop = function(e) {
        // this/e.target is current target element.
        if (e.stopPropagation) {
          // stops the browser from redirecting.
          e.stopPropagation();
        }
        e.preventDefault();
		this.classList.remove('moving');

		var source_model = $window['drag_source'].model;

		if (ngModel.$modelValue.indexOf(source_model) != -1) {

			var temp = angular.copy(ngModel.$modelValue[global_drag_index]);

			sortable.unbind();

			ngModel.$modelValue.splice(global_drag_index,1);
			ngModel.$modelValue.splice(global_drop_index,0, temp);

		}

          //return;
          scope.$apply();

          if ( sortable.options &&  angular.isDefined(sortable.options.stop) ){

            sortable.options.stop(ngModel.$modelValue,global_drop_index,
              element.extra_data,$window['drag_source_extra']);
          }


        return false;
      };

      sortable.handleDragEnd = function(e) {
        // this/e.target is the source node.
        [].forEach.call(sortable.cols_, function (col) {
          //col.classList.remove('over');
          col.classList.remove('moving');
        });

      };

      //Unbind all events are registed before
      sortable.unbind = function(){


        [].forEach.call(sortable.cols_, function (col) {
          col.removeAttribute('draggable');
          col.removeEventListener('dragstart', sortable.handleDragStart, false);
          col.removeEventListener('dragenter', sortable.handleDragEnter, false);
          col.removeEventListener('dragover', sortable.handleDragOver, false);
          col.removeEventListener('dragleave', sortable.handleDragLeave, false);
          col.removeEventListener('drop', sortable.handleDrop, false);
          col.removeEventListener('dragend', sortable.handleDragEnd, false);
        });
        sortable.in_use = false;
      }

      sortable.activehandle = function(){
        sortable.is_handle = true;
      }

      sortable.update = function(){

        $window['drag_source'] = null;
        var index = 0;
        this.cols_ =  element[0].children;

        [].forEach.call(this.cols_, function (col) {
          if ( sortable.options &&  sortable.options.handle){
            var handle = col.querySelectorAll(sortable.options.handle)[0];
            handle.addEventListener('mousedown', sortable.activehandle, false);
          }

          col.index = index;
          col.model = ngModel.$modelValue[index];

          index++;
          // console.log(index);

          col.setAttribute('draggable', 'true');  // Enable columns to be draggable.
          col.addEventListener('dragstart', sortable.handleDragStart, false);
          col.addEventListener('dragenter', sortable.handleDragEnter, false);
          col.addEventListener('dragover', sortable.handleDragOver, false);
          col.addEventListener('dragleave', sortable.handleDragLeave, false);
          col.addEventListener('drop', sortable.handleDrop, false);
          col.addEventListener('dragend', sortable.handleDragEnd, false);
        });

        sortable.in_use = true;
      }

      if (ngModel) {
        ngModel.$render = function() {
          $timeout(function(){
            //Init flag indicate the first load sortable is done or not
            sortable.first_load = false;

            scope.$watch('ngExtraSortable',function(value){
              element.extra_data = value;
              //sortable.extra_data = value;
            })

            scope.$watch('htmlSortable', function(value) {


              sortable.options = angular.copy(value) ;

              if (value == "destroy" ){
                if (sortable.in_use){
                  sortable.unbind();
                  sortable.in_use = false;
                }
                return;
              }

              if ( !angular.isDefined(sortable.options)){
                sortable.options = {};
              }

              if ( !angular.isDefined(sortable.options.allow_cross)){
                sortable.options.allow_cross = false
              }

              if ( angular.isDefined(sortable.options.construct) ){
                sortable.options.construct(ngModel.$modelValue);
              }
              element[0].classList.add('html5-sortable');
              sortable.update();
              $timeout(function(){
                sortable.first_load = true;
              })
            }, true);

            //Watch ngModel and narrate it
            scope.$watch('ngModel', function(value) {
              if ( !sortable.first_load || sortable.options == 'destroy' ){
                //Ignore on first load
                return;
              }


              $timeout(function(){
                sortable.update();
                console.log('sortable update');
              });

            },true);

          });
        };
      }
      else{

      }
    }
  };
});
