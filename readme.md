[![Node.js CI](https://github.com/jfoclpf/geoapi.pt/actions/workflows/node.js.yml/badge.svg)](https://github.com/jfoclpf/geoapi.pt/actions/workflows/node.js.yml)
[![CodeQL Security Check](https://github.com/jfoclpf/geoapi.pt/actions/workflows/codeql.yml/badge.svg)](https://github.com/jfoclpf/geoapi.pt/actions/workflows/codeql.yml)
[![js-standard-style][js-standard-style_img]][js-standard-style_url]
![Request last hour](https://img.shields.io/endpoint?url=https%3A%2F%2Fgeoapi.pt%2Fshieldsio%2FrequestsLastHour)
![Request last day](https://img.shields.io/endpoint?url=https%3A%2F%2Fgeoapi.pt%2Fshieldsio%2FrequestsLastDay)
<br>
[![Donate with librepay](https://img.shields.io/liberapay/receives/joaopimentel1980.svg?logo=liberapay)](https://en.liberapay.com/joaopimentel1980)
[![Donate with librepay](https://img.shields.io/badge/donate-Donate-yellow?logo=liberapay)](https://en.liberapay.com/joaopimentel1980/donate)

[js-standard-style_img]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[js-standard-style_url]: https://standardjs.com/

| Caminho | Propósito | Exemplo  |
|-----|---------|---|
| /gps/{latitude},{longitude}  | Distrito, Município e Freguesia através de coordenadas GPS  | [https://geoapi.pt/gps/40.153687,-8.51460](https://geoapi.pt/gps/40.153687,-8.514602)  |
| /municipios/{município}  | Detalhes sobre Município  | [https://geoapi.pt/municipios/évora](https://geoapi.pt/municipios/évora)  |
| /municipios/{município}/freguesias  | Lista de Freguesias no Município  | [https://geoapi.pt/municipios/porto/freguesias](https://geoapi.pt/municipios/porto/freguesias)  |
| /municipios/{município}/freguesias/{freguesia}  | Detalhes sobre Freguesia de um Município  | [https://geoapi.pt/municipios/guimarães/freguesias/serzedelo](https://geoapi.pt/municipios/guimarães/freguesias/serzedelo)  |
| /freguesias/{freguesia}  | Detalhes sobre Freguesia  | [https://geoapi.pt/freguesias/serzedelo](https://geoapi.pt/freguesias/serzedelo)  |
| /freguesias  | Lista de todas as Freguesias  | [https://geoapi.pt/freguesias](https://geoapi.pt/freguesias)  |
| /distritos/municipios  | Municípios por Distrito  | [https://geoapi.pt/distritos/municipios](https://geoapi.pt/distritos/municipios)  |
| /distritos  | Lista de Distritos  | [https://geoapi.pt/distritos](https://geoapi.pt/distritos)  |
| /cp/{CP4-CP3}  | Detalhes sobre Código Postal CP4-CP3  | [https://geoapi.pt/cp/2495-300](https://geoapi.pt/cp/2495-300)  |
| /cp/{CP4}  | Detalhes sobre Código Postal CP4  | [https://geoapi.pt/cp/2495](https://geoapi.pt/cp/2495)  |


<p>Para quaisquer resultados em JSON basta adicionar a variável <code>json=1</code> ao pedido GET (<a href="https://geoapi.pt/cp/2495-300?json=1">exemplo</a>).</p>

Para mais informações ver [`docs/routes.md`](/docs/routes.md).

# GEO API PT

[RESTful API](https://restfulapi.net/) which provides information on official divisional administrative regions of Portugal (based on "Carta Administrativa Oficial de Portugal, 2020", from [here](https://www.dgterritorio.gov.pt/dados-abertos)). It includes information on mainland Portugal, Azores and Madeira.

It also provides information on Postal Codes.

You can use freely the public API at `https://geoapi.pt`. The limit per IP is 100 requests per 15 minutes.

It uses NodeJS ([much faster](https://benchmarksgame-team.pages.debian.net/benchmarksgame/fastest/python.html) than Python) to create a HTTP server allowing several GET requests. It also [pre-processes all the raw data](/prepareServer.js) for fast real-time delivery.

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
