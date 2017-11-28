var express = require('express');
var app = express();


var net = require('net');

var client = new net.Socket();
client.connect(4000, '192.168.1.7', function() {
	console.log('Conectado a Arduino');
	
});

client.on('data', function(data) {
	console.log('Received: ' + data);
	//client.destroy(); // kill client after server's response
});

client.on('close', function() {
	console.log('Connection closed');
});






app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/controladores/:controlador_id', function (req, res) {
    str = 'F' + req.params.controlador_id + ',';
    console.log(str);
    client.write(str);
    res.send('enviado.');
});


app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});