"use strict";
var YAML = require('yamljs');


class Bd {
    constructor(name) {
        this.yaml = name; // por ahora name es un archivo yaml
        this.datos = YAML.load(this.yaml);
        /*
        this.datos = { "dispositivos": [{"contr":2,"disp":1,"desc":"Relé 1"},
                                        {"contr":2,"disp":2,"desc":"Relé 2"}],
                       "eventoAccion": [{"contr":3,"disp":1,"evt":"152"},
                                        {"contr":2,"disp":2,"acc":"3"}] };
        */
    }

    print() {
        console.log ("datos : "+YAML.stringify(this.datos, 4)) ;
    }

    

}
module.exports = Bd;
