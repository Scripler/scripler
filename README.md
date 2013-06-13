Scripler
========
The Scripler web application source code repository.

Folder Structure
----------------

* documentation
 * Early documentation drafts of the API
* public
 * Static files to be deliveredserved through the Web server
* views
 * Dynamic templates that needs rendering before being served from the Web server 
* config
 * Configuration files for the Node.js server
* models
 * The MongoDB schemas for the collections
* routes
 * Application logic for the different logical domains

Requirements
------------
 * [MongoDB][1]
 * [Node.js][2] 10.0+

Installation
------------
    npm install

How To Run
----------
    node app.js
    

Bcrypt Installation Problems
----------------------------
Ask for a pre-build module, or follow the guide:
https://github.com/ncb000gt/node.bcrypt.js/#dependencies

  [1]: http://www.mongodb.org/
  [2]: http://nodejs.org/