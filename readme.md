[![Node.js CI](https://github.com/jfoclpf/geoapi.pt/actions/workflows/node.js.yml/badge.svg)](https://github.com/jfoclpf/geoapi.pt/actions/workflows/node.js.yml)
[![CodeQL Security Check](https://github.com/jfoclpf/geoapi.pt/actions/workflows/codeql.yml/badge.svg)](https://github.com/jfoclpf/geoapi.pt/actions/workflows/codeql.yml)
[![js-standard-style][js-standard-style_img]][js-standard-style_url]
![Request last hour](https://img.shields.io/endpoint?url=https%3A%2F%2Fgeoapi.pt%2Fshieldsio%2Frequestslasthour)
![Request last day](https://img.shields.io/endpoint?url=https%3A%2F%2Fgeoapi.pt%2Fshieldsio%2Frequestslastday)
<br>
[![Donate with librepay](https://img.shields.io/liberapay/receives/joaopimentel1980.svg?logo=liberapay)](https://en.liberapay.com/joaopimentel1980)
[![Donate with librepay](https://img.shields.io/badge/donate-Donate-yellow?logo=liberapay)](https://en.liberapay.com/joaopimentel1980/donate)

[js-standard-style_img]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[js-standard-style_url]: https://standardjs.com/

# GEO API PT

[RESTful API](https://restfulapi.net/) which provides information on official divisional administrative regions of Portugal (based on "Carta Administrativa Oficial de Portugal, 2020", from [here](https://www.dgterritorio.gov.pt/dados-abertos)). It includes information on mainland Portugal, Azores and Madeira.

It also provides information on Postal Codes.

You can use freely the public API at `https://geoapi.pt`. The limit per IP is 100 requests per 15 minutes.

It uses NodeJS ([much faster](https://benchmarksgame-team.pages.debian.net/benchmarksgame/fastest/python.html) than Python) to create a HTTP server allowing several GET requests. It also [pre-processes all the raw data](/prepareServer.js) for fast real-time delivery.

## Routes

This API follows the [OpenAPI Specification](https://en.wikipedia.org/wiki/OpenAPI_Specification), thus you can see all the routes in the file [`openapi.yaml`](https://github.com/jfoclpf/geoapi.pt/blob/main/src/public/openapi.yaml) file. See also [`docs/routes.md`](/docs/routes.md) or the main page at [geoapi.pt](https://geoapi.pt).

## JSON or HTML

By default the server replies with `text/html` format. To receive JSON format, either

 - add the query parameter `json=1` to the URL (ex.: `/municipios/évora?json=1`)
 - in the GET request set the HTTP header Accept as JSON, that is, `Accept: application/json`

## Install this API on your machine

 1. Install NodeJS and git
 2. Clone the project (just the latest version):<br>
    `git clone --depth=1 https://github.com/jfoclpf/geoapi.pt.git`
 3. Enter the newly created directory and install dependencies<br>
    `cd geoapi.pt && npm ci`
 4. Start the server<br>
    `npm start --port=8080`

### Continuous operation

For permanent and continuous operation (production) use for example [pm2](https://pm2.keymetrics.io/docs/usage/quick-start/) or [forever](https://www.npmjs.com/package/forever).

#### With pm2

```
npm install pm2@latest -g
pm2 start src/server/index.js -- --port 8080
```

### Debug

```
DEBUG=geoapipt:* npm start --port=8080
```
