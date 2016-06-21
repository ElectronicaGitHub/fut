var http = require('http');

var server = http.createServer(function (req, res) {
 for (var i=0; i<1000; i++) {
   server.on('request', function leakyfunc() {});
 }

 res.end('Hello World\n');
}).listen(1337, '127.0.0.1');
server.setMaxListeners(0);
console.log('Server running at http://127.0.0.1:1337/. Process PID: ', process.pid);

var heapdump = require('heapdump');
var path = require('path');
var fs = require('fs');
heapdump.writeSnapshot(path.join(__dirname, 'var/local/') + Date.now() + '.heapsnapshot');