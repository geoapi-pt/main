# geo-pt-api

Detect official divisional administrative regions of Portugal (last updated 2020, from [here](http://mapas.dgterritorio.pt/ATOM-download/CAOP-Cont/Cont_AAD_CAOP2020.zip)), providing GPS coordinates as input.

It creates a HTTP server, whose GET request `/?lat=40.153687&lon=-8.514602` returns a JSON

```json
{
  "freguesia": "Anobra",
  "concelho": "Condeixa-A-Nova",
  "distrito":"Coimbra"
}
```

## How to install the API on your machine

 1. Install nodeJS, npm and git
 2. Clone the project:
    `git clone https://github.com/jfoclpf/geo-pt-api.git`
 3. Enter the newly created directory and install dependencies
    `cd geo-pt-api && npm install`
 4. Start the server
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
