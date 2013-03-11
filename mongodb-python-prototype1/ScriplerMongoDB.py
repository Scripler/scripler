import pymongo
from bson.objectid import ObjectId

'''
Created on Feb 14, 2013

@author: allanmc
'''

class ScriplerMongoDB(object):
    '''
    classdocs
    '''
    def __init__(self):
        '''
        Constructor
        '''
        self.connection = pymongo.MongoClient('10.0.0.6', 27017)
        self.db = self.connection["scripler"]
        self.users = self.db["users"]
        self.projects = self.db["projects"]
        self.documents = self.db["documents"]
        #self.colAccessGrants = self.db["access-grants"]
        
        self.users.ensure_index([("username", 1)], unique=True)
        #self.projects.drop_index([("members.userId", 1)])
        self.projects.ensure_index([("_id", 1),("members.userId", 1)], unique=True)
        #self.colAccessGrants.ensure_index([("userId", 1)])
        #self.colAccessGrants.ensure_index([("projectId", 1)])
        
    def close(self):
        self.connection.close()

    def createUser(self, username, email, passwordHash, name):
        return self.users.insert({"username": username, "email": email, "passwordHash": passwordHash, "name": name})
    
    def removeUser(self, adminUserId, userId):
        #TODO: Security check
        if adminUserId == userId:
            self.users.remove( {"_id": ObjectId(userId)})
            self.projects.update({"members.userId": userId}, {"$pull": {"members": {"userId": userId}}}, multi=True)
            return True
        return False
    
    def removeUserByUsername(self, username):
        #TODO: Security check
        return self.users.remove( {"username": username})
    
    def getUsers(self):
        return self.users.find({}, {"username": 1, "name": 1}).sort("_id", 1).limit(5)
    
    def getUser(self, userId):
        return self.users.find_one({"_id": ObjectId(userId)}, {"username":1, "name":1, "projects": 1})
    
    def getUserByUsername(self, username):
        return self.users.find_one({"username": username}, {"_id":1, "username": 1, "passwordHash":1})
    
    def getProjects(self):
        return self.projects.find({}, {"name": 1, "description": 1})
    
    def getUsersProjects(self, userId):
        return self.projects.find({"members.userId": ObjectId(userId)}, {"name": 1, "description": 1})
    
    def getProject(self, projectId):
        return self.projects.find_one({"_id": ObjectId(projectId)}, {"name": 1, "description": 1, "members": 1, "documents": 1})
    
    def createProject(self, userId, name, description):
        user = self.getUser(userId)
        projectId = self.projects.insert({"name": name, "description": description, "members": [{"userId": userId, "username": user["username"], "access": ["admin"]}]})
        self.users.update({"_id": ObjectId(userId)}, {"$push": {"projects": {"projectId": str(projectId), "name": name}}})
        return projectId
    
    def removeProject(self, adminUserId, projectId):
        print "removeProject(%s, %s)" % (adminUserId, projectId)
        if self.hasAccessToProject(adminUserId, projectId, "admin"):
            self.documents.remove({"projectId" : projectId})
            self.projects.remove( {"_id": ObjectId(projectId)})
            self.users.update({"projects.projectId": projectId}, {"$pull": {"projects": {"projectId": projectId}}}, multi=True)
            #self.colAccessGrants.remove({"projectId" : projectId})
            return True
        return False
    
    def createDocument(self, userId, projectId, title):
        if self.hasAccessToProject(userId, projectId, "admin"):
            documentId = self.documents.insert({"projectId": projectId, "document": ""})
            self.projects.update({"_id": ObjectId(projectId)}, {"$push": {"documents": {"documentId": str(documentId), "title": title}}})
            return documentId
        return None
    
    def hasAccessToDocument(self, userId, documentId, access):
        document = self.documents.find_one({"_id": ObjectId(documentId)})
        return self.hasAccessToProject(userId, document["projectId"], access)
        
    def hasAccessToProject(self, userId, projectId, access):
        return self.projects.find_one({"_id": ObjectId(projectId), "members": {"$elemMatch": {"userId": userId, "access": access}}}) != None
        
    #def isProjectAdmin(self, adminUserId, projectId):
    #    project = self.projects.find_one({"_id": ObjectId(projectId)})
    #    return project != None and project["userId"] == adminUserId
    
    def saveDocument(self, adminUserId, documentId, xml):
        if self.hasAccessToDocument(adminUserId, documentId, "admin"):
            self.documents.update({"_id": ObjectId(documentId)}, {'$set': {'document': xml}})
            return True
        return False
        
    def getAccessGrants(self, projectId):
        #return self.colAccessGrants.find({"projectId": ObjectId(projectId)})
        return self.projects.find({"_id": ObjectId(projectId)}, {"members": 1})

    def getDocuments(self, projectId):
        return self.projects.find_one({"_id": ObjectId(projectId)}, {"documents": 1})
    
    def getDocument(self, documentId):
        return self.documents.find_one({"_id": ObjectId(documentId)})
    
    def getFirstDocument(self):
        return self.documents.find_one()
    
    def getDocumentCount(self):
        return self.documents.count()
    
    def removeDocument(self, adminUserId, documentId):
        if self.hasAccessToDocument(adminUserId, documentId, "admin"):
            projectId = self.documents.find_one({"_id": ObjectId(documentId)}, {"projectId": 1})["projectId"]
            self.documents.remove( {"_id": documentId})
            self.projects.update({"_id": ObjectId(projectId)}, {"$pull": {"documents": {"documentId": documentId}}})
            return True
        return False
    
    def createAccess(self, adminUserId, projectId, userId, access):
        if self.hasAccessToProject(adminUserId, projectId, "admin"):
            if self.projects.find_one({"_id": ObjectId(projectId), "members.userId" : userId}) != None:
                #User already has access to the project - just ensure that new access grant i added.
                self.projects.update({"_id": ObjectId(projectId), "members.userId" : userId}, {"$addToSet": {"members.$.access": access}})
            else:
                #Users first access to this project - so add him to the project with the new access grant.
                user = self.getUser(userId)
                project = self.projects.find_and_modify({"_id": ObjectId(projectId)}, {"$push": {"members": {"userId": userId, "username": user["username"], "access": [access]}}})
                self.users.update({"_id": ObjectId(userId)}, {"$push": {"projects": {"projectId": str(projectId), "name": project["name"]}}})
            return True
        return False
    
    def removeAllAccess(self, adminUserId, projectId, userId):
        if self.hasAccessToProject(adminUserId, projectId, "admin"):
            self.projects.update({"_id": ObjectId(projectId)}, {"$pull": {"members": {"userId": userId}}})
            return True
        else:
            return False
        
    def removeAccess(self, adminUserId, projectId, userId, access):
        if self.hasAccessToProject(adminUserId, projectId, "admin"):
            self.projects.update({"_id": ObjectId(projectId), "members.userId" : userId}, {"$pull": {"members.$.access": access}})
            return True
        else:
            return False
        