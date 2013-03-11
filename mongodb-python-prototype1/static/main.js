$(document).ready(function () {
	jQuery.support.cors = true;
    var selectedUserID = "",
        selectedProjectID = "",
        selectedDocumentID = "";
    
        
    function initDialog(selector, width, height, title, callback) {
        var dialog_buttons = {}; 
        dialog_buttons[title] = function () {
			callback();
            $( this ).dialog( "close" );
       	};
        dialog_buttons['Cancel'] = function () {
            $( this ).dialog( "close" );
       	};
        $(selector).dialog({
            autoOpen: false,
            height: height,
            width: width,
            modal: true,
            buttons: dialog_buttons,
            close: function () {
                //Do nothing
            }
        });
    } 

	initDialog('#dialog-login', 350, 250, "Login", function () {
        callScripler('POST', 'login', {username:$("#loginUsername").val(), password: $("#loginPassword").val()}, function(data){
        	//updateProjectList();
        	if (data != null) { 
        		selectedUserID = data
        		updateProjectList();
        		$("#users-container").hide();
        	} else {
        		alert("Wrong login!");
        	}
        });
	}); 
	
	initDialog('#dialog-project', 350, 250, "Create project", function () {
        callScripler('POST', 'projects', {userId: selectedUserID, name:$("#projectName").val(), description: $("#projectDescription").val()}, function(){
        	updateProjectList();
        });
	}); 

	initDialog('#dialog-user', 350, 370, "Create user", function () {
        callScripler('POST', 'users', {username:$("#username").val(), email: $("#email").val(), password: $("#password").val(), name: $("#name").val()}, function(){
        	updateUserList();
        });
    });

    initDialog('#dialog-document', 350, 200, "Create document", function () {
        callScripler('POST', 'projects/'+selectedProjectID+'/documents', {title: $("#documentTitle").val()}, function(data){
        	if (data != null) { 
        		updateProject();
        	} else {
        		alert("Could not create document. Access denied!");
        	}
        });
	});

    initDialog('#dialog-access', 350, 250, "Grant access", function () {
        callScripler('POST', 'projects/'+selectedProjectID+'/users', {userId: $("#accessUserID").val(), rights: $("#accessType").val()}, function(data){
        	if (data != false) { 
        		updateProject();
        	} else {
        		alert("Could grant access. Access denied!");
        	}
        });
	});

	$("#users tbody" ).on('click', '.delete', function () {
		var userId = $(this).closest('tr').find('td:first').text();
		callScripler('DELETE', 'users/'+userId, undefined, function () {	
			updateUserList();
		});
	});
	
	$("#projects tbody" ).on('click', '.delete', function () {
		var projectId = $(this).closest('tr').find('td:first').text();
		callScripler('DELETE', 'projects/'+projectId, undefined, function (data) {
			if (data == true) {  
				updateProjectList();
			} else {
				alert('Could not delete project. Access denied!');
			}
		});
	});
	
	$("#project-documents tbody" ).on('click', '.delete', function () {
		var documentId = $(this).closest('tr').find('td:first').text();
		callScripler('DELETE', 'documents/'+ documentId, undefined, function (data) {
			if (data == true) {  
				updateProject();
			} else {
				alert('Could not delete document. Access denied!');
			}
		});
	});
	
	$("#project-members tbody" ).on('click', '.delete', function () {
		var userId = $(this).closest('tr').find('td:first').text();
		callScripler('DELETE', 'projects/'+ selectedProjectID + '/users/' + userId, undefined, function (data) {
			if (data == true) {  
				updateProject();
			} else {
				alert('Could not delete document. Access denied!');
			}
		});
	});
	
	$("#users tbody").on('click', 'tr', function () {
		selectedUserID = selectRowAndReturnId(this);
		updateProjectList();
	});
	
	$("#projects tbody").on('click', 'tr', function () {
		selectedProjectID = selectRowAndReturnId(this);
		updateProject();
	});
	
	$("#project-documents tbody").on('click', 'tr', function () {
		selectedDocumentID = selectRowAndReturnId(this);
		updateDocument();
	});

	function selectRowAndReturnId(element) {
		var row = $(element).closest('tr');
		var ret = $(row).find('td:first').text();
		$(element).closest('table').find('tr').each(function() {
			if ($(this).is(row)) {
				$(this).closest('tr').addClass("highlight");
			} else {
				$(this).closest('tr').removeClass("highlight");
			}
		});
		return ret;
	}

    $("#create-user").button().click(function () {
        $("#dialog-user").dialog("open");
    });
    $("#create-project").button().click(function () {
        $("#dialog-project").dialog("open");
    });
    $("#create-document").button().click(function () {
        $("#dialog-document").dialog("open");
    });
    $("#grant-access").button().click(function () {
        $("#dialog-access").dialog("open");
    });
    $("#login-button").button().click(function () {
        $("#dialog-login").dialog("open");
    });
    $("#logout-button").button().click(function () {
        selectedUserID = ""
		updateProjectList();
		$("#users-container").show();
    });
    $("#save-document").button().click(function () {
		callScripler('PUT', 'documents/'+ selectedDocumentID, {document: $('#documentText').val()}, function (data) {
			if (data == true) {  
				updateDocument();
			} else {
				alert('Could not save document. Access denied!');
			}
		});
    });

    function updateUserList() {
    	selectedUserID = "";
       	callScripler('GET', 'users', undefined, function (data) {
       		$( "#users tbody" ).empty();
       		$.each(data,function(i, item) {
        		$( "#users tbody" ).append( "<tr>" +
        		  "<td>" + item._id + "</td>" +
	              "<td>" + item.username + "</td>" +
	              "<td>" + item.name + "</td>" +
	              "<td><span class=\"delete\">DELETE</span><br /></td>" +
	            "</tr>" );
        	});
        });
	}

    function updateProjectList() {
    	selectedProjectID = "";
    	if (selectedUserID != "") {
           	callScripler('GET', 'users/'+selectedUserID, undefined, function (data) {
           		$( "#projects tbody" ).empty();
           		$( "#projects-container" ).show();
           		if (data.projects != undefined) {
	           		$.each(data.projects,function(i, item) {
	            		$( "#projects tbody" ).append( "<tr>" +
	            		  "<td>" + item.projectId + "</td>" +
			              "<td>" + item.name + "</td>" +
			              "<td><span class=\"delete\">DELETE</span><br /></td>" +
			            "</tr>" );
	            	});
            	}
            });
		} else {
			$( "#projects-container" ).hide();
			selectedProjectID = "";
		}
		updateProject();
	}

	function updateProject() {
       	selectedDocumentID = "";
       	if (selectedProjectID != "") {
           	callScripler('GET', 'projects/'+selectedProjectID, undefined, function (data) {
           		$("#project-container tbody").empty();
           		$("#project-container").show();
           		$("#projectNameText").text(data.name);
           		$("#projectDescriptionText").text(data.description);
           		if (data.members != undefined) {
	           		$.each(data.members,function(i, item) {
	            		$( "#project-members tbody" ).append( "<tr>" +
	            		  "<td>" + item.userId + "</td>" +
			              "<td>" + item.username + "</td>" +
			              "<td>" + item.access + "</td>" +
			              "<td><span class=\"delete\">DELETE</span><br /></td>" +
			            "</tr>" );
	            	});
                }
           		if (data.documents != undefined) {
	           		$.each(data.documents,function(i, item) {
	            		$( "#project-documents tbody" ).append( "<tr>" +
	            		  "<td>" + item.documentId + "</td>" +
			              "<td>" + item.title + "</td>" +
			              "<td><span class=\"delete\">DELETE</span><br /></td>" +
			            "</tr>" );
	            	});
            	}
            });
        } else {
        	$("#project-container").hide();
        	selectedDocumentID = "";
        }
        updateDocument();
	}


    function updateDocument() {
    	if (selectedDocumentID != "") {
           	callScripler('GET', 'documents/'+selectedDocumentID, undefined, function (data) {
           		$( "#document-container" ).show();
           		$("#documentText").val(data.document);
            });
        } else {
       		$( "#document-container" ).hide();
        }
	}


    function callScripler(method, path, data, successCallback) {

        $.ajax({
            type: method,
            url: 'http://localhost:5000/'+path,
            data: JSON.stringify(data),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: successCallback,
            error: function (objRequest) {
                alert('Error: ' + objRequest.responseText);
            }
        });
    };
    
    
    function init() {
		updateUserList();
		updateProjectList();
		updateProject();
		updateDocument();
    }
    
	init();
});