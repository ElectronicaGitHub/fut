var http = require('http');

http.createServer(function (req, res) {
    res.send('ok');
}).listen(8080);
console.log('Magic happens on port 8080'); 
