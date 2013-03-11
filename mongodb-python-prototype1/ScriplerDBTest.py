# coding=UTF-8
'''
Created on Feb 14, 2013

@author: allanmc
'''
import unittest
from ScriplerMongoDB import ScriplerMongoDB
import hashlib
import markovgen
import random

class Test(unittest.TestCase):

    def setUp(self):
        self.db = ScriplerMongoDB()
        self.markov = markovgen.Markov(open("jeeves.txt"))
        self.text1 = self.markov.generate_markov_text(10000)
        self.text2 = self.markov.generate_markov_text(10000)
        self.name1 = self.markov.generate_markov_text(10)
        self.name2 = self.markov.generate_markov_text(10)
        self.name3 = self.markov.generate_markov_text(10)
        self.createUsers()
        
    def tearDown(self):
        self.db.close()


    def createUsers(self):
        passwordHash = hashlib.sha256('secret').hexdigest()
        print "Creating 10000 users one at a time..."
        for n in range(1,10000): 
            username = 'testUser'+str(n)
            #Create user if he doesn't already exists
            if self.db.getUserByUsername(username) == None:
                #Create tester user
                user = self.db.createUser(username, 'testtesttest.com', passwordHash, 'This is my name')
                print 'Created user: %s' % user
            else:
                print "User %s already created, so skipping user creation!" % username
                break
        print "All 10000 users should be ready."

    def testMixAccess(self):
        print "Exchanging project rights between two random users."
        user1 = self.db.getUserByUsername('testUser'+str(random.randint(1, 10000)))
        user2 = self.db.getUserByUsername('testUser'+str(random.randint(1, 10000)))
        userId1 = str(user1["_id"])
        userId2 = str(user2["_id"])
        print "userId1: %s" % userId1
        print "userId2: %s" % userId2
        if user1 == user2:
            print "Skipped - because of same user"
            return #Just skip if we found the same users
        user1 = self.db.getUser(userId1)
        user2 = self.db.getUser(userId2)
        if not "projects" in user1 or not "projects" in user2 or len(user1["projects"]) == 0 or len(user2["projects"]) == 0:
            print "Skipped - because of missing project from one of the users"
            return
        user1Project = user1["projects"][0]["projectId"]
        user2Project = user2["projects"][0]["projectId"]
        self.db.createAccess(userId1, user1Project, userId2, "admin")
        self.db.createAccess(userId2, user2Project, userId1, "admin")

    def testAllStuff(self):
        print "Adding a new project with two documents to a random user."
        #Select a random testUser, and add 1 project with 2 documents for him.
        userId1 = self.db.getUserByUsername('testUser'+str(random.randint(1, 10000)))
        print "Selected user: %s" % userId1['username']
        userId1 = userId1["_id"]
        
        print "userId1: %s" % userId1
        startDocumentCount = self.db.getDocumentCount()
        projectId = self.db.createProject(str(userId1), self.name1, "This is a simple test project")
        print "New projectId  %s" % projectId
        documentId1 = self.db.createDocument(str(userId1), str(projectId), self.name2)
        print "New documentId1: %s" % documentId1
        assert documentId1 != None, "Project admin should be able to create a document with access granted"
        self.db.createAccess(str(userId1), str(projectId), str(userId1), "read")
        #self.db.createAccess(str(userId1), str(projectId), str(userId2), "test")
        documentId2 = self.db.createDocument(str(userId1), str(projectId), self.name3)
        print "New documentId2: %s" % documentId2
        ret = self.db.saveDocument(str(userId1), str(documentId1), self.text1)
        assert ret == True, "userId1 should be allowed to save documents in this project"
        ret = self.db.saveDocument(str(userId1), str(documentId2), self.text2)
        assert ret == True, "userId1 should be allowed to save documents in this project"
        #ret = self.db.saveDocument(str(userId2), str(documentId1), self.text + " - Appended some text.")
        #assert ret == False, "userId2 should not be allowed to save documents in this project"
        endDocumentCount = self.db.getDocumentCount()
        assert startDocumentCount + 2 == endDocumentCount, "Two extra document should have been added"
        
        #Remove stuff:
        #ret = self.db.removeDocument(userId2, documentId1)
        #assert ret == False, "userId2 should not be allowed to remove documents in this project"
        #ret = self.db.removeProject(userId2, projectId)
        #assert ret == False, "userId2 should not be allowed to remove this project"
        #ret = self.db.removeAccess(userId2, projectId, userId1)
        #assert ret == False, "userId2 should not be allowed to remove access to this project"
        #        
        #ret = self.db.removeDocument(userId1, documentId2)
        #assert ret == True, "userId1 should be allowed to remove documents in this project"
        #ret = self.db.removeAccess(userId1, projectId, userId1)
        #assert ret == True, "userId1 should be allowed to remove access to this project"
        #ret = self.db.removeProject(str(userId1), str(projectId))
        #assert ret == True, "userId1 should be allowed to remove this project before the document is explicitly removed"
        #    
        #self.db.removeUser(userId1)
        #self.db.removeUser(userId2)
        
            
if __name__ == "__main__":
    unittest.main()