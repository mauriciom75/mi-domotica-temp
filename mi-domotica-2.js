"use strict";

var genericPool = require('generic-pool');

var express = require('express');
var app = express();

var net = require('net');



var Bd = require('./bd.js')
//var client = new net.Socket();
//var resultado = {};


//var controlador = {};


var bdatos = new Bd('dispositivos.yml');
console.log("Prueba Bd :"+ bdatos.print());

var id_invocacion=1;

// -----------------------------------------------------------------------------------
/**
 * Step 1 - Create pool using a factory object
 */
const factory = {
    create: function(){
         return new Promise(function(resolve, reject){
              //var client = DbDriver.createClient()
              console.log("creando una conexión.")
              

              var client = {}
              client['conectando'] = true;
              client['valido'] = true;
              client['socket'] = new net.Socket();
              client.socket.connect(4000, '192.168.1.7', function() {
                  console.log('Conectado a Arduino');
                  client['conectando'] = false;
                  resolve(client)
              });
              //client.on('connected', function(){
              //    resolve(client)
              //});
              client.socket.on('close', function() {
                  console.log('Cerraron la conexión');


                  


                  /*
                  setTimeout(function () {
                    console.log('Reabro conexión');

                    client.connect(4000, '192.168.1.7', function() {
                        console.log('Conectado a Arduino luego del close');
                    });
                  },1000); //espero 1 segundo para reabrir
                  */
              });
              client.socket.on('data', function(data) {

                  var datArdu = decodificarDatosArduino(data);
                  console.log( "Datos Arduino : " + JSON.stringify(datArdu) );
                  procesarMensajeGenerico(client.socket, datArdu);
              });
              client.socket.on('error', function(err) {

                console.log("Error en socket: " + err );
                
                  if (client.conectando)
                  {
                      console.log("hubo un problema al intentar conectar, espero 5 segundos")
                      setTimeout(function(){
                          console.log("invoco a resolve(), pero marco como inválida para que el pool la vea y la reinicie");
                          client.valido = false; //para que el pool lo destruya
                          resolve(client);
                      },5000);
                  } else {
                      console.log("no fué al intentar conectar, espero 5 segundos")
                      setTimeout(function(){
                          console.log("invoco a resolve(), pero marco como inválida para que el pool la vea y la reinicie");
                          client.valido = false; //para que el pool lo destruya
                          resolve(client);
                      },5000);
                      
                  }
                //client.valido = false; //para que el pool lo destruya

                //client.destroy();
/*
                setTimeout(function () {
                    console.log('Reabro conexión');

                    client.connect(4000, '192.168.1.7', function() {
                        console.log('Conectado a Arduino');
                    });
                  },1000); //espero 1 segundo para reabrir
*/
              });
              
         })
    },
    destroy: function(client){
        console.log('Destroy1');
        return new Promise(function(resolve){

          console.log('Destroy2');

          client.socket.on('close', function(){
	    client.socket.removeAllListeners('data');
            setTimeout( function () 
                { console.log("esteré 3 segundos");
                resolve(); } 
            , 3000 ); //demoro 1 segundo para no invadir reconectando
          })
          client.socket.destroy()
        })
    },
    validate: function(client){
        console.log('Validate1');
        return new Promise(function(resolve){

          console.log('Validate2');
          if ( client.valido )
                resolve(true)
          else
            resolve(false);
        })
    }
};

var opts = {
    max: 1, // maximum size of the pool // hoy no soporta mas de una conexión por los nrf24l01. Habría que agregarles sesion
    min: 1, // minimum size of the pool
    evictionRunIntervalMillis: 10000 ,
    testOnBorrow: true ,
    acquireTimeoutMillis: 60000
};


var myPool = genericPool.createPool(factory, opts);
myPool.on('factoryCreateError', function(err){
  console.log("error al crear recurso de pool: " + err.message );
})
 
myPool.on('factoryDestroyError', function(err){
  console.log("error al destruir recurso de pool: " + err.message );
})
// -----------------------------------------------------------------------------------
// Funciones varias

function decodificarDatosArduino(data)
{
    console.log('Received: ' + data );
    //client.destroy(); // kill client after server's response
    var data = data.toString();
    var tipo = data.substring(0,1);
    var valores = data.substring(1);
    valores = valores.split(",");

    console.log("tipo:" + tipo)
    console.log("valores ->" + valores)

    var ret = {};
    ret['tipo']= tipo;
    ret['valores']=valores;

    return ret;
}

function codificarDatosArduino(tipo, valores)
{
    var ret = tipo + valores + ',\n';
    console.log("mensaje codificado:" + ret);
    return ret;
}

function procesarMensajeGenerico(client, datArdu)
{
    if (datArdu.tipo=='E')
    {
        if (datArdu.valores[0]=='3' &&
            datArdu.valores[1]=='1' &&
            datArdu.valores[2]=='152' )
        {
            var aux=codificarDatosArduino('A',['2','2','3','0','0','0']);
            client.write(aux);
        }
        if (datArdu.valores[0]=='2' &&
            datArdu.valores[1]=='3' &&
            datArdu.valores[2]=='101' )
        {
	    setTimeout ( function () {
	            // obtengo un id de invocacion
		    id_invocacion = ( id_invocacion + 1 ) % 256;
	            var aux=codificarDatosArduino('A',[id_invocacion,'2','1','1','0','0','0']);
	            client.write(aux, function () { console.log("listo el write.") });
	   },500);
        }
        if (datArdu.valores[0]=='2' &&
            datArdu.valores[1]=='3' &&
            datArdu.valores[2]=='103' )
        {
	    setTimeout ( function () {
	            // obtengo un id de invocacion
		    id_invocacion = ( id_invocacion + 1 ) % 256;
	            var aux=codificarDatosArduino('A',[id_invocacion,'2','1','2','0','0','0']);
	            client.write(aux, function () { console.log("listo el write.") });
	   },500);
        }
    }
}


// -----------------------------------------------------------------------------------

app.get('/', function (req, res) {
  res.send('Hello World!');
});


app.get('/controladores/:controlador_id', function (req, res) {

    var micb={};
    var str;
    console.log("1");
//    const resourcePromise = myPool.acquire()
    var resourcePromise1 = myPool.acquire()

    console.log("2");
    resourcePromise1.then( function(client) {

            console.log("3");

            // obtengo un id de invocacion
	    id_invocacion = ( id_invocacion + 1 ) % 256;

            str = 'F' + id_invocacion + ',' + req.params.controlador_id + ',';
            console.log(str);
            client.socket.write(str);
            
            var controlador = {};

             
            function miOnData(data) {

                    var datArdu = decodificarDatosArduino(data);
                    var tipo=datArdu.tipo;
                    var valores=datArdu.valores;

                    if (tipo == 'C')
                    {
                      
                      controlador = {};
                      
                      controlador['id_invocacion'] = valores[0];
                      controlador['id'] = valores[1];
                      controlador['cant'] = valores[2];
                      controlador['dispositivos'] = [];

                      //console.log("controlador ->" + JSON.stringify(controlador));

                    }
                    if (tipo == 'D')
                    {

                      var dispositivo = {};

                      dispositivo['id_invocacion'] = valores[0];
                      dispositivo['contr_id'] = valores[1];
                      dispositivo['nroDisp'] = valores[2];
                      dispositivo['estado'] = valores[3];
                      dispositivo['desc'] = valores[4];
                      
                      controlador['dispositivos'].push(dispositivo);


                    }
                    if (tipo == 'F')
                    {

                        //console.log("resultado ->" +  JSON.stringify(resultado));
                        //cb (controlador);
                        console.log("Llegó mensaje de fin.");

                        micb (200);
                          
                    }
            };
            console.log("declaro on data");
            client.socket.on('data', miOnData );
            

            // call back final para responder.
            micb = function (httpSatus) {

                    console.log("cb, tengo que devolver status: "+ httpSatus +" - "+ JSON.stringify(controlador))
                    //res.set("Connection", "close"); // agrego para evitar error _http_outgoing.js:356--- throw new Error('Can\'t set headers after they are sent.');
                    res.status(httpSatus).send(JSON.stringify(controlador));
                    console.log("ejecuto release.");
                    client.socket.removeListener('data',miOnData); // elimino la funcion para evento "on data".
                    // agrego un delay antes de devolver al pool. Sinó se trulaba andá saber que cosa.
                    setTimeout( function () { 
                        myPool.release(client);
                    }, 500);
            };

            tout = function () { 
                micb(504); 
                client.socket.removeListener('timeout',tout); // elimino la funcion para evento "timeout".
            };

            client.socket.setTimeout(15000, tout() ); //tiempo de espera para devolver la página web se ha agotado


    })
    .catch(function(err){
    // handle error - this is generally a timeout or maxWaitingClients  
    // error 
        console.log("hubo error: " + err );
    });






});

// ---------------------------------------

app.put('/controladores/:controlador_id/dispositivos/:nroDisp', function (req, res){

    console.log("1");
//    const resourcePromise = myPool.acquire()
    var resourcePromise2 = myPool.acquire()

    console.log("2");
    resourcePromise2.then( function(client) {

            console.log("3");

            var tout = setTimeout(function () {
                console.log("Timeout, devuelvo el recurso al pool");
                res.sendStatus(500);
                myPool.release(client);
                clearTimeout(tout);
            }, 10000); // si en un tiempo no terminé quiero deolver el recurso al pool.

	    id_invocacion = ( id_invocacion + 1 ) % 256;

            var accion = "3";
            var valores = [id_invocacion, req.params.controlador_id, req.params.nroDisp, accion, '0','0','0'];
            var msg = codificarDatosArduino( 'A', valores);
                        
            client.socket.write(msg, function () {
                clearTimeout(tout);
                res.sendStatus(200);
                // agrego un delay antes de devolver al pool. Sinó se trulaba andá saber que cosa.
                setTimeout( function () { 
                    myPool.release(client);
                }, 500);
            });
    })
});

// ---------------------------------------

app.put('/controladores/:controlador_id/dispositivos/:nroDisp/encender', function (req, res){

    console.log("1");
//    const resourcePromise = myPool.acquire()
    var resourcePromise2 = myPool.acquire()

    console.log("2");
    resourcePromise2.then( function(client) {

            console.log("3");

            var tout = setTimeout(function () {
                console.log("Timeout, devuelvo el recurso al pool");
                res.sendStatus(500);
                myPool.release(client);
                clearTimeout(tout);
            }, 10000); // si en un tiempo no terminé quiero deolver el recurso al pool.

	    id_invocacion = ( id_invocacion + 1 ) % 256;
            var accion = "1";
            var valores = [ id_invocacion, req.params.controlador_id, req.params.nroDisp, accion, '0','0','0'];
            var msg = codificarDatosArduino( 'A', valores);
                        
            client.socket.write(msg, function () {
                clearTimeout(tout);
                res.sendStatus(200);
                setTimeout( function () { 
                    myPool.release(client);
                }, 500);

            });
    })
});
// ---------------------------------------

app.put('/controladores/:controlador_id/dispositivos/:nroDisp/apagar', function (req, res){

    console.log("1");
//    const resourcePromise = myPool.acquire()
    var resourcePromise2 = myPool.acquire()

    console.log("2");
    resourcePromise2.then( function(client) {

            console.log("3");


            var tout = setTimeout(function () {
                console.log("Timeout, devuelvo el recurso al pool");
                res.sendStatus(500);
                myPool.release(client);
                clearTimeout(tout);
            }, 10000); // si en un tiempo no terminé quiero deolver el recurso al pool.

	    id_invocacion = ( id_invocacion + 1 ) % 256;
            var accion = "2";
            var valores = [ id_invocacion , req.params.controlador_id, req.params.nroDisp, accion, '0','0','0'];
            var msg = codificarDatosArduino( 'A', valores);
                        
            client.socket.write(msg, function () {
                res.sendStatus(200);
                clearTimeout(tout);
                setTimeout( function () { 
                    myPool.release(client);
                }, 500);

            });
    })
});

// ---------------------------------------

app.get('/controladores/:controlador_id/dispositivos/:nroDisp/estado', function (req, res){

    var micb={};
    var str;

    console.log("Estado pool avail:"+myPool.available+" borroed:"+myPool.borrowed+" pending:"+myPool.pending);

    console.log("1");
//    const resourcePromise = myPool.acquire()
    var resourcePromise3 = myPool.acquire()

    console.log("2");
    resourcePromise3.then( function(client) {

            console.log("3");
            // obtengo un id de invocacion
	    id_invocacion = ( id_invocacion + 1 ) % 256;

            str = 'F' + id_invocacion + ',' + req.params.controlador_id + ',';
            console.log(str);
            client.socket.write(str);
            
            var controlador = {};

             
            function miOnData(data) {

                    var datArdu = decodificarDatosArduino(data);
                    var tipo=datArdu.tipo;
                    var valores=datArdu.valores;

                    if (tipo == 'C')
                    {
                      
                      controlador = {};
                      
                      controlador['id_invocacion'] = valores[0];
                      controlador['id'] = valores[1];
                      controlador['cant'] = valores[2];
                      controlador['dispositivos'] = [];

                      //console.log("controlador ->" + JSON.stringify(controlador));

                    }
                    if (tipo == 'D')
                    {

                      var dispositivo = {};

	              dispositivo['id_invocacion'] = valores[0];
                      dispositivo['contr_id'] = valores[1];
                      dispositivo['nroDisp'] = valores[2];
                      dispositivo['estado'] = valores[3];
                      dispositivo['desc'] = valores[4];
                      
                      controlador['dispositivos'].push(dispositivo);


                    }
                    if (tipo == 'F')
                    {

                        //console.log("resultado ->" +  JSON.stringify(resultado));
                        //cb (controlador);
                        console.log("Llegó mensaje de fin.");
                        micb (200);
                          
                    }
            };
            
            client.socket.on('data', miOnData );
            
            function stout () { 
                console.log("timeout!");
                micb(504); 
                //client.socket.removeListener('timeout',tout); // elimino la funcion para evento "timeout".
            };

            client.socket.setTimeout(15000, stout ); //tiempo de espera para devolver la página web se ha agotado


            function miOnerror () { 
                console.log("Error en socket");
                micb(502); 
                //client.socket.removeListener('timeout',tout); // elimino la funcion para evento "timeout".
            };

            client.socket.on('error', miOnerror ); //tiempo de espera para devolver la página web se ha agotado


            var tout = setTimeout(function () {
                console.log("Timeout, devuelvo el recurso al pool");
                micb(500); 
            }, 60000); // si en 1 minuto no terminé quiero deolver el recurso al pool.


            // call back final para responder.
            micb = function (httpSatus) {

                    // filtro solo el dispositivo que me pidieron
                    var estado = 1;
                    if ( controlador.dispositivos )
                        controlador.dispositivos.forEach(function(dispositivo) {
                            if (dispositivo.nroDisp==req.params.nroDisp)
                            {
                                estado = dispositivo.estado;
                            }
                        });

                    console.log("cb, tengo que devolver status: " + httpSatus + " estado: " + estado)
                    //res.set("Connection", "close"); // agrego para evitar error _http_outgoing.js:356--- throw new Error('Can\'t set headers after they are sent.');
                    
                    res.status(httpSatus).send(estado.toString());

                    console.log("ejecuto release.");
                    client.socket.removeListener('data',miOnData); // elimino la funcion para evento "on data".
                    client.socket.removeListener('timeout',stout);
                    client.socket.removeListener('error',miOnerror);
                    clearTimeout(tout); 
                    // agrego un delay antes de devolver al pool. Sinó se trulaba andá saber que cosa.
                    setTimeout( function () { 
                        myPool.release(client);
                    }, 500);
            };


            
    })
    .catch(function(err){
    // handle error - this is generally a timeout or maxWaitingClients  
    // error 
        console.log("hubo error " + err );
    });









});



// ---------------------------------------

app.get('/controladores/:controlador_id/dispositivos/:nroDisp/2estado', function (req, res){

    var micb={};
    var str;

    console.log("Estado pool avail:"+myPool.available+" borroed:"+myPool.borrowed+" pending:"+myPool.pending);

    console.log("1");
//    const resourcePromise = myPool.acquire()
    var resourcePromise3 = myPool.acquire()

    console.log("2");
    resourcePromise3.then( function(client) {

            console.log("3");
            // obtengo un id de invocacion
	    id_invocacion = ( id_invocacion + 1 ) % 256;

            str = 'H' + id_invocacion + ',' + req.params.controlador_id + ',' + req.params.nroDisp + ',';
            console.log(str);
            client.socket.write(str);
            
            var dispositivo = {};

             
            function miOnData(data) {

                    var datArdu = decodificarDatosArduino(data);
                    var tipo=datArdu.tipo;
                    var valores=datArdu.valores;

                    if (tipo == 'D')
                    {

	              dispositivo['id_invocacion'] = valores[0];
                      dispositivo['contr_id'] = valores[1];
                      dispositivo['nroDisp'] = valores[2];
                      dispositivo['estado'] = valores[3];
                      dispositivo['desc'] = valores[4];

                      micb (200);
                          
                    }
            };
            
            client.socket.on('data', miOnData );
            
            function stout () { 
                console.log("timeout!");
                micb(504); 
                //client.socket.removeListener('timeout',tout); // elimino la funcion para evento "timeout".
            };

            client.socket.setTimeout(30000, stout ); //tiempo de espera para devolver la página web se ha agotado


            function miOnerror () { 
                console.log("Error en socket");
                micb(502); 
                //client.socket.removeListener('timeout',tout); // elimino la funcion para evento "timeout".
            };

            client.socket.on('error', miOnerror ); //tiempo de espera para devolver la página web se ha agotado


            var tout = setTimeout(function () {
                console.log("Timeout, devuelvo el recurso al pool");
                micb(500); 
            }, 60000); // si en 1 minuto no terminé quiero deolver el recurso al pool.


            // call back final para responder.
            micb = function (httpSatus) {

                    // filtro solo el dispositivo que me pidieron
                    var estado = 1;
                    if ( dispositivo.id_invocacion )
                                estado = dispositivo.estado;

                    console.log("cb, tengo que devolver status: " + httpSatus + " estado: " + estado)
                    //res.set("Connection", "close"); // agrego para evitar error _http_outgoing.js:356--- throw new Error('Can\'t set headers after they are sent.');
                    
                    res.status(httpSatus).send(estado.toString());

                    console.log("ejecuto release.");
                    client.socket.removeListener('data',miOnData); // elimino la funcion para evento "on data".
                    client.socket.removeListener('timeout',stout);
                    client.socket.removeListener('error',miOnerror);
                    clearTimeout(tout); 
                    // agrego un delay antes de devolver al pool. Sinó se trulaba andá saber que cosa.
                    setTimeout( function () { 
                        myPool.release(client);
                    }, 500);
            };


            
    })
    .catch(function(err){
    // handle error - this is generally a timeout or maxWaitingClients  
    // error 
        console.log("hubo error " + err );
    });



});






app.get('/controladores/:controlador_id/dispositivos/:nroDisp/datos', function (req, res){

    var micb={};
    var str;

    console.log("Estado pool avail:"+myPool.available+" borroed:"+myPool.borrowed+" pending:"+myPool.pending);

    console.log("1");
//    const resourcePromise = myPool.acquire()
    var resourcePromise3 = myPool.acquire()

    console.log("2");
    resourcePromise3.then( function(client) {

            console.log("3");
            // obtengo un id de invocacion
            id_invocacion = ( id_invocacion + 1 ) % 256;

            str = 'H' + id_invocacion + ',' + req.params.controlador_id + ',' + req.params.nroDisp + ',';
            console.log(str);
            client.socket.write(str);

            var dispositivo = {};


            function miOnData(data) {

                    var datArdu = decodificarDatosArduino(data);
                    var tipo=datArdu.tipo;
                    var valores=datArdu.valores;

                    if (tipo == 'D')
                    {

                      dispositivo['id_invocacion'] = valores[0];
                      dispositivo['contr_id'] = valores[1];
                      dispositivo['nroDisp'] = valores[2];
                      dispositivo['estado'] = valores[3];
                      dispositivo['desc'] = valores[4];

                      micb (200);

                    }
            };

            client.socket.on('data', miOnData );

            function stout () {
                console.log("timeout!");
                micb(504);
                //client.socket.removeListener('timeout',tout); // elimino la funcion para evento "timeout".
            };

            client.socket.setTimeout(30000, stout ); //tiempo de espera para devolver la página web se ha agotado


            function miOnerror () {
                console.log("Error en socket");
                micb(502);
                //client.socket.removeListener('timeout',tout); // elimino la funcion para evento "timeout".
            };

            client.socket.on('error', miOnerror ); //tiempo de espera para devolver la página web se ha agotado


            var tout = setTimeout(function () {
                console.log("Timeout, devuelvo el recurso al pool");
                micb(500);
            }, 60000); // si en 1 minuto no terminé quiero deolver el recurso al pool.


            // call back final para responder.
            micb = function (httpSatus) {

                    // filtro solo el dispositivo que me pidieron
                    var datos = "0;0;";
                    if ( dispositivo.id_invocacion )
                    {
                                datos = dispositivo.desc;
                    }

                    console.log("cb, tengo que devolver status: " + httpSatus + " datos : " + datos)
                    //res.set("Connection", "close"); // agrego para evitar error _http_outgoing.js:356--- throw new Error('Can\'t set headers after they are sent.');

                    res.status(httpSatus).send(datos);

                    console.log("ejecuto release.");
                    client.socket.removeListener('data',miOnData); // elimino la funcion para evento "on data".
                    client.socket.removeListener('timeout',stout);
                    client.socket.removeListener('error',miOnerror);
                    clearTimeout(tout);
                    // agrego un delay antes de devolver al pool. Sinó se trulaba andá saber que cosa.
                    setTimeout( function () {
                        myPool.release(client);
                    }, 500);
            };



    })
    .catch(function(err){
    // handle error - this is generally a timeout or maxWaitingClients
    // error
        console.log("hubo error " + err );
    });



});










app.listen(3000, function () {
  console.log('Example app listening on port 3000! Joya!');
});
