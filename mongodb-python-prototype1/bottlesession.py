from bottle import request, response
import glob
import pickle
import os

#Source: https://github.com/ConceptPending/bottlesession

class session:
    #Objects of this class will allow for easy session management in a bottle-py based, web app
    sessionid = ''
    sess = {}
    secret_key = ''
    
    def __init__(self, secret_key="reallyinsecurepassword"):
        #Set the secret key to sign the cookies
        self.secret_key = secret_key
        #Look for a session cookie
        #If one exists, then open the corresponding session file. Otherwise, continue with a blank session.
        try:
            self.sessionid = request.get_cookie("sessionid", secret=self.secret_key)
            try:
                #Load the session variables from file
                self.sess = pickle.load("/sessions/"+self.sessionid+".ses")
            except (KeyboardInterrupt, SystemExit):
                raise
            except:
                #If the file doesn't exist, continue with a blank session.
                pass
        except (KeyboardInterrupt, SystemExit):
            raise
        except:
            #If the file doesn't exist, continue with a blank session.
            pass
    
    def set(self, arg1, arg2):
        self.sess[arg1] = arg2
    
    def read(self, arg1):
        return self.sess[arg1]
    
    def close(self):
        if self.sessionid == '':
            #generate a new sessionid
            ids = glob.glob("/sessions/*.ses")
            highest = 0
            for i in ids:
                if int(i[:-4]) > highest:
                    highest = int(i[:-4])
            self.sessionid = highest + 1
            #save the session variables back to file
            if not os.path.exists("sessions/"):
                os.makedirs("sessions")
            path = "sessions/"+str(self.sessionid)+".ses"
            f = open(path,"w")
            pickle.dump(self.sess, f)
            f.close()
        #set the sessionid in the user cookie
        response.set_cookie("sessionid", self.sessionid, secret=self.secret_key)