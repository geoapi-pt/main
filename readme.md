<h1 align="center">
  <a href="https://geoapi.pt"><img src="https://github.com/jfoclpf/geoapi.pt/blob/main/src/public/src/icons/mstile-310x310.png?raw=true" alt="logo" width="200"/></a>
</h1>

[![JSON API documentation](https://img.shields.io/badge/JSON%20API-Documentation-informational)](https://geoapi.pt/docs)
[![Test API server](https://github.com/geoapi-pt/main/actions/workflows/main_test.yml/badge.svg)](https://github.com/geoapi-pt/main/actions/workflows/main_test.yml)
[![CodeQL Security Check](https://github.com/geoapi-pt/main/actions/workflows/codeql.yml/badge.svg)](https://github.com/geoapi-pt/main/actions/workflows/codeql.yml)
[![js-standard-style][js-standard-style_img]][js-standard-style_url]
![Request last hour](https://img.shields.io/endpoint?url=https%3A%2F%2Fgeoapi.pt%2Fshieldsio%2Frequestslasthour)
![Request last day](https://img.shields.io/endpoint?url=https%3A%2F%2Fgeoapi.pt%2Fshieldsio%2Frequestslastday)

[js-standard-style_img]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg
[js-standard-style_url]: https://standardjs.com/

[RESTful API](https://restfulapi.net/) which provides information on official divisional administrative regions of Portugal (based on "Carta Administrativa Oficial de Portugal, 2022", from [here](https://www.dgterritorio.gov.pt/dados-abertos)). It includes information on mainland Portugal, Azores and Madeira. It also provides information on Postal Codes and Census. 

[Uptime of this server](https://stats.uptimerobot.com/rWEK3trBEP).

It uses NodeJS ([much faster](https://benchmarksgame-team.pages.debian.net/benchmarksgame/fastest/python.html) than Python) to create a HTTP server allowing several GET requests. It pre-processes all the raw data for fast real-time delivery.

## Docs and Routes

All the API documentation is at [geoapi.pt/docs](https://geoapi.pt/docs).

This API follows the [OpenAPI Specification](https://en.wikipedia.org/wiki/OpenAPI_Specification), thus you can see all the routes in the [`openapi.yaml`](/src/public/src/openapi.yaml) file. 

## Directory structure of the main project

This is the `main` public repo of the geoapi.pt project

The directory structure of the main project should be like:
```
./               # geoapi-pt/root (private)
 ├── resources/  # geoapi-pt/resources (private)
 ├── main/       # this repo (public)
```

## JSON or HTML

By default the server replies with `text/html` format. To receive JSON format, chose **one** of these:

 - add the query GET parameter `json=1` to the URL (ex.: [`/municipio/évora?json=1`](https://geoapi.pt/municipio/evora?json=1));
 - set the HTTP request header `Accept` as JSON, that is, `Accept: application/json`; or
 - in case you're using the public API, use the host `json.geoapi.pt` (ex: [`json.geoapi.pt/cp/2495-300`](https://json.geoapi.pt/cp/2495-300))
 
For pretty-printing JSON as HTML response, use in the query `?json=belo`, for example [`/cp/2495-300?json=belo`](https://geoapi.pt/cp/2495-300?json=belo)
