var express = require('express');
var app = express();


var net = require('net');

var client = new net.Socket();

var resultado = {};

client.connect(4000, '192.168.1.7', function() {
	console.log('Conectado a Arduino');
	
});

var controlador = {};
client.on('data', function(data) {

	console.log('Received: ' + data );
	//client.destroy(); // kill client after server's response
  data = data.toString();
  tipo = data.substring(0,1);
  valores = data.substring(1);
  valores = valores.split(",");

  console.log("tipo:" + tipo)
  console.log("valores ->" + valores)

  
  if (tipo == 'C')
  {
    
    controlador = {};
    
    controlador['id'] = valores[0];
    controlador['cant'] = valores[1];
    controlador['dispositivos'] = [];

    //console.log("controlador ->" + JSON.stringify(controlador));

  }
  if (tipo == 'D')
  {

    var dispositivo = {};

    dispositivo['controlador_id'] = valores[0];
    dispositivo['nroDispositivo'] = valores[1];
    dispositivo['estadoEnc'] = valores[2];
    dispositivo['descripcion'] = valores[3];
    
    controlador['dispositivos'].push(dispositivo);

    //console.log("controlador ->" + JSON.stringify(controlador));

    if ( dispositivo.nroDispositivo >= controlador.cant )
    {
       resultado =controlador;
       //console.log("resultado ->" +  JSON.stringify(resultado));
       cb ();
    } 
        
  }
});

client.on('close', function() {
	console.log('Connection closed');
  console.log('Reabro conexión');

  client.connect(4000, '192.168.1.7', function() {
	  console.log('Conectado a Arduino');
  
  });

});




app.get('/', function (req, res) {
  res.send('Hello World!');
});

var cb = {};
app.get('/controladores/:controlador_id', function (req, res) {
    str = 'F' + req.params.controlador_id + ',';
    console.log(str);
    client.write(str);

    cb = function () {
        console.log("cb, tengo que devolver"+ JSON.stringify(resultado))
        res.send(JSON.stringify(resultado));
      
    };
    /*
    setTimeout(function () 
      {
        console.log("timeout, tengo que devolver"+ JSON.stringify(resultado))
        res.send(JSON.stringify(resultado));
        
      }
    , 15000)
    */
});


app.listen(3000, function () {
  console.log('Example app listening on port 3000! Joya!');
});