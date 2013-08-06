var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        console.log('spawning worker #' + (i+1) + '...');
        cluster.fork();
    }
    cluster.on('online', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' is running!');
    });
    
    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died. Restarting!');
        cluster.fork();
    });
} else {
    // Load up application as a worker
    require('./app.js');
}