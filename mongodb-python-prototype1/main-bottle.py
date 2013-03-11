from bottle import error, request, route, run, get, post, put, delete, static_file
from bottlesession import session
import json
from ScriplerMongoDB import ScriplerMongoDB
from MongoJSONEncoder import MongoJSONEncoder
import hashlib

db = ScriplerMongoDB()
        
def toJSON(cursor):
    return json.dumps(cursor, cls=MongoJSONEncoder)

sess = session()

@error(500)
def custom500(error):
    return 'Scripler failed: %s' % str(error.exception)
 
@route('/static/<filename>')
def callback(filename):
    return static_file(filename, './static/')
 
@get('/')
def api_root():
    return static_file("index.html", './static/')

@post('/login')
def api_login():
    user = db.getUserByUsername(request.json['username'])
    ret = None
    if user != None and user["passwordHash"] == hashlib.sha256(request.json['password']).hexdigest():
        sess.set('sessionUserId', str(user['_id']))
        sess.close()
        ret = str(user['_id'])
    return toJSON(ret)

@post('/logout')
def api_logout():
    sess.set('sessionUserId', '')
    sess.close()


#USERS
@get('/users')
def api_users():
    return toJSON(db.getUsers())

@post('/users')
def api_users_create():
    return toJSON(db.createUser(request.json['username'],
                                request.json['email'],
                                hashlib.sha256(request.json['password']).hexdigest(),
                                request.json['name']))
@get('/users/<userid>')
def api_user(userid):
    #Temporary "cheat" login
    sess.set('sessionUserId', userid)
    sess.close()
    return toJSON(db.getUser(userid))

@put('/users/<userid>')
def api_user(userid):
    return toJSON(db.modifyUser(userid,
                                request.json['username'],
                                request.json['email'],
                                request.json['passwordHash'],
                                request.json['name']))
@delete('/users/<userid>')
def api_users_create(userid):
    return toJSON(db.removeUser(sess.read('sessionUserId'), userid))


#PROJECTS
@get('/projects')
def api_projects():
    return toJSON(db.getProjects())

@post('/projects')
def api_projects_create():
    return toJSON(db.createProject(request.json['userId'],
                                   request.json['name'],
                                   request.json['description']))

@get('/projects/<projectid>')
def api_project(projectid):
    return toJSON(db.getProject(projectid))

@put('/projects/<projectid>')
def api_project_modify(projectid):
    return toJSON(db.modifyDocument(projectid,
                                    request.json['name'],
                                    request.json['description']))

@delete('/projects/<projectid>')
def api_project_delete(projectid):
    return toJSON(db.removeProject(sess.read('sessionUserId'), projectid))

#DOCUMENTS
@get('/projects/<projectid>/documents')
def api_documents(projectid):
    return toJSON(db.getDocuments(projectId))

@post('/projects/<projectid>/documents')
def api_documents_create(projectid):
    return toJSON(db.createDocument(sess.read('sessionUserId'), projectid, request.json['title']))

@get('/documents/<documentid>')
def api_document( documentid):
    return toJSON(db.getDocument(documentid))

@put('/documents/<documentid>')
def api_document_modify(documentid):
    return toJSON(db.saveDocument(sess.read('sessionUserId'),
                                  documentid,
                                  request.json['document']))

@delete('/documents/<documentid>')
def api_document_delete(documentid):
    return toJSON(db.removeDocument(sess.read('sessionUserId'), documentid))


#USER RIGHTS
@get('/projects/<projectid>/users')
def api_projectusers(projectid):
    return toJSON(db.getAccessGrants(projectid))

@post('/projects/<projectid>/users')
def api_projectusers_create(projectid):
    return toJSON(db.createAccess(sess.read('sessionUserId'),
                                  projectid,
                                  request.json['userId'],
                                  request.json['rights']))

@get('/projects/<projectid>/users/<userid>')
def api_projectuser(projectid, userid):
    return toJSON(db.getAccessGrants(projectid))

@put('projects/<projectid>/users/<userid>')
def api_projectuser_modify(projectid, userid):
    return toJSON(db.modifyAccess(sess.read('sessionUserId'),
                                  projectid,
                                  request.json['userId'],
                                  request.json['rights']))

@delete('/projects/<projectid>/users/<userid>')
def api_projectuser_delete(projectid, userid):
    return toJSON(db.removeAllAccess(sess.read('sessionUserId'), projectid, userid))



if __name__ == '__main__':
    run(host='0.0.0.0', port=5000, debug=True)