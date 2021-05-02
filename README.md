# geo-pt-api

Detect official divisional administrative regions of Portugal ("Carta Administrativa Oficial de Portugal - CAOP 2020", from [here](https://www.dgterritorio.gov.pt/dados-abertos)), providing GPS coordinates as input. You can use the public API [here](https://geo-pt-api.joaopimentel.com/?lat=40.153687&lon=-8.514602). It includes mainland Portugal, Azores and Madeira.

It creates a HTTP server allowing several GET requests.

## Paths and parameters

### Root path /

The root path has three parameters: `lat`, `lon` and `detalhes` (optional).

The GET request `/?lat=40.153687&lon=-8.514602` returns a JSON

```json
{
   "freguesia":"Anobra",
   "concelho":"Condeixa-A-Nova",
   "distrito":"Coimbra"
}
```

You may also request details for the returned municipality and parish with `/?lat=40.153687&lon=-8.514602&detalhes=1`, which outputs:

```json
{
   "freguesia":"Anobra",
   "concelho":"Condeixa-A-Nova",
   "distrito":"Coimbra",
   "detalhesFreguesia":{
      "codigo":"6946",
      "entidade":"Anobra (CONDEIXA-A-NOVA)",
      "tipoentidade":"Freguesia",
      "nif":"501280049",
      "rua":"Beco da Junta",
      "localidade":"Anobra (CONDEIXA-A-NOVA)",
      "codigopostal":"3150-012",
      "descrpostal":"ANOBRA",
      "email":"jfanobra@gmail.com",
      "telefone":"239943911",
      "fax":"239943911",
      "sitio":"www.freguesiadeanobra.pt",
      "codigoine":"60401",
      "eleitores2011":"1023",
      "populacao2011":"1357",
      "areaha":"1638.29",
      "nomecompleto":"Anobra"
   },
   "detalhesMunicipio":{
      "codigo":"2630",
      "entidade":"CONDEIXA-A-NOVA",
      "tipoentidade":"Município",
      "nif":"501275380",
      "rua":"Largo Artur Barreto",
      "localidade":"CONDEIXA-A-NOVA",
      "codigopostal":"3150-128",
      "descrpostal":"CONDEIXA-A-NOVA",
      "email":"geral@cm-condeixa.pt",
      "telefone":"239949120",
      "fax":"239942711",
      "sitio":"www.cm-condeixa.pt",
      "presidentecamara":"Nuno Moita da Costa",
      "areaha":"138.67",
      "populacao":"17078",
      "eleitores":"12658",
      "codigoine":"604"
   }
}
```

### /listaDeMunicipios

Returns a JSON array with municipalities names, alphabetically sorted

### /listaDeFreguesias

Returns a JSON array with parishes (freguesias) names, alphabetically sorted


### /listaDeMunicipiosComFreguesias

Returns a JSON array of objects, each object corresponding to a municipality and an array of its parishes

```json
[
   {
      "nome":"Abrantes",
      "freguesias":[
         "Bemposta",
         "Carvalhal",
         "Fontes",
         "Martinchel",
         "Mouriscas",
         "Pego",
         "Rio de Moinhos",
         "Tramagal",
         "União das freguesias de Abrantes (São Vicente e São João) e Alferrarede",
         "União das freguesias de Aldeia do Mato e Souto",
         "União das freguesias de Alvega e Concavada",
         "União das freguesias de São Facundo e Vale das Mós",
         "União das freguesias de São Miguel do Rio Torto e Rossio ao Sul do Tejo"
      ]
   },
   {
      "nome":"Aguiar da Beira",
      "freguesias":[
         "Carapito",
         "Cortiçada",
         "Dornelas",
         "Eirado",
         "Forninhos",
         "Pena Verde",
         "Pinheiro",
         "União das freguesias de Aguiar da Beira e Coruche",
         "União das freguesias de Sequeiros e Gradiz",
         "União das freguesias de Souto de Aguiar da Beira e Valverde"
      ]
   },
   "etc"
 ]
```

## How to install this API on your machine

 1. Install nodeJS, npm and git
 2. Clone the project:<br>
    `git clone https://github.com/jfoclpf/geo-pt-api.git`
 3. Enter the newly created directory and install dependencies<br>
    `cd geo-pt-api && npm install`
 4. Start the server<br>
    `npm start --port=8080`

## Continuous operation

For permanent and continuous operation use for example [pm2](https://pm2.keymetrics.io/docs/usage/quick-start/) or [forever](https://www.npmjs.com/package/forever), using directly the node script located at the root directory

`node server.js --port=8080`.

### With pm2

```
npm install pm2@latest -g
pm2 start server.js -- --port 8080
```

## Debug

```
DEBUG=http npm start --port=8080
```
