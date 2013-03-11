Scripler - MongoDB/Python Prototype
===================================

Requirements:

 - [MongoDB][1] (configure host/ip in ScriplerMongoDB.py)
 - [Python][2] 2.7
 - Python modules:
   - [Bottle][3] (web/http micro framework)
   - [pymongo][4] (MongoDB driver)

Generate test data
------------------
    python ScirplerDBTest.py
(run as many times as you like - the more runs, the more data)

Run the REST API
----------------
    python main-bottle.py


  [1]: http://www.mongodb.org/
  [2]: http://www.python.org/
  [3]: http://bottlepy.org/
  [4]: http://api.mongodb.org/python/current/