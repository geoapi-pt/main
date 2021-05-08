const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const PolygonLookup = require('polygon-lookup')
const proj4 = require('proj4')
const async = require('async')
const debug = require('debug')('http')
const commandLineArgs = require('command-line-args')
const colors = require('colors/safe')

const mainPageUrl = 'https://www.geoptapi.org/'

const prepareServerMod = require(path.join(__dirname, 'prepareServer.js'))

const serverPort = process.env.npm_config_port ||
                   commandLineArgs([{ name: 'port', type: Number }]).port ||
                   '8080'

// fetched from prepareServerMod
// see global objects "regions" and "administrations" on prepareServer.js
let regions, administrations

function prepareServer (callback) {
  prepareServerMod((err, data) => {
    if (err) {
      callback(Error(err))
    } else {
      regions = data.regions
      administrations = data.administrations
      callback()
    }
  })
}

function startServer (callback) {
  const app = express()
  app.use(cors())
  app.use(bodyParser.json())

  app.get('/', function (req, res) {
    res.redirect(mainPageUrl)
  })

  app.get('/gps', function (req, res) {
    try {
      debug('new query: ', req.query)
      const lat = parseFloat(req.query.lat) // ex: 40.153687
      const lon = parseFloat(req.query.lon) // ex: -8.514602
      const isDetails = Boolean(parseInt(req.query.detalhes))

      const point = [lon, lat] // longitude, latitude

      for (const key in regions) {
        const transformedPoint = proj4(regions[key].projection, point)

        const lookupFreguesias = new PolygonLookup(regions[key].geojson)
        const freguesia = lookupFreguesias.search(transformedPoint[0], transformedPoint[1])

        if (freguesia) {
          debug('Found freguesia: ', freguesia)
          const local = {
            freguesia: freguesia.properties.Freguesia,
            concelho: freguesia.properties.Concelho,
            distrito: freguesia.properties.Distrito
          }

          if (isDetails) {
            // search for details for parishes (freguesias)
            const numberOfParishes = administrations.parishesDetails.length
            // regex to remove leading zeros
            const codigoine = (freguesia.properties.Dicofre || freguesia.properties.DICOFRE).replace(/^0+/, '')
            for (let i = 0; i < numberOfParishes; i++) {
              if (codigoine === administrations.parishesDetails[i].codigoine.replace(/^0+/, '')) {
                local.detalhesFreguesia = administrations.parishesDetails[i]
                break // found it, break loop
              }
            }

            // search for details for municipalities (municipios)
            const numberOfMunicipalities = administrations.muncicipalitiesDetails.length
            const concelho = freguesia.properties.Concelho.toLowerCase().trim()
            for (let i = 0; i < numberOfMunicipalities; i++) {
              if (concelho === administrations.muncicipalitiesDetails[i].nome.toLowerCase().trim()) {
                local.detalhesMunicipio = administrations.muncicipalitiesDetails[i]
                break // found it, break loop
              }
            }
          }

          debug(local)

          res.status(200).json(local)
          return
        }
      }

      debug('Results not found')

      res.status(404).json({ error: 'Results not found. Coordinates out of scope!' })
    } catch (e) {
      debug('Error on server', e)

      res.status(400).json(
        { error: 'Wrong request! Example of good request: /gps?lat=40.153687&lon=-8.514602' }
      )
    }
  })

  app.get(['/municipio', '/municipios'], function (req, res) {
    // no parameters, list of municipalities
    if (Object.keys(req.query).length === 0) {
      res.status(200).json(administrations.listOfMunicipalitiesNames)
      return
    }

    const { nome } = req.query
    let results = [...administrations.muncicipalitiesDetails]

    if (nome) {
      const municipalityToFind = nome.toLowerCase().trim()
      results = results.filter(
        municipality => municipality.nome.toLowerCase().trim() === municipalityToFind
      )
    }

    // remaining filters
    const filters = ['codigo', 'nif', 'codigopostal',
      'email', 'telefone', 'fax', 'sitio', 'codigoine']

    for (const filter of filters) {
      if (req.query[filter]) {
        results = results.filter(p => p[filter] === req.query[filter])
      }
    }

    if (results.length) {
      res.status(200).json(results)
    } else {
      res.status(404).json({ error: 'Municipality not found!' })
    }
  })

  app.get(['/freguesia', '/freguesias'], function (req, res) {
    // no parameters, list of parishes
    if (Object.keys(req.query).length === 0) {
      res.status(200).json(administrations.listOfParishesNames)
      return
    }

    const { nome, municipio } = req.query
    let results = [...administrations.parishesDetails]

    if (nome) {
      const parishToFind = nome.toLowerCase().trim()
      results = results.filter(parish => {
        const name1 = parish.nome.toLowerCase().trim()
        const name2 = parish.nomecompleto.toLowerCase().trim()
        const name3 = parish.nomecompleto2.toLowerCase().trim()
        return parishToFind === name1 || parishToFind === name2 || parishToFind === name3
      })
    }

    if (municipio) {
      const municipalityToFind = municipio.toLowerCase().trim()
      results = results.filter(
        parish => parish.municipio.toLowerCase().trim() === municipalityToFind
      )
    }

    // remaining filters
    const filters = ['codigo', 'nif', 'codigopostal',
      'email', 'telefone', 'fax', 'sitio', 'codigoine']

    for (const filter of filters) {
      if (req.query[filter]) {
        results = results.filter(p => p[filter] === req.query[filter])
      }
    }

    if (results.length) {
      res.status(200).json(results)
    } else {
      res.status(404).json({ error: 'Parish not found!' })
    }
  })

  // /municipio(s)/freguesia(s)
  app.get(/^\/municipios?\/freguesias?$/, function (req, res) {
    res.status(200).json(administrations.listOfMunicipalitiesWithParishes)
  })

  app.use(function (req, res) {
    if (req.url.includes('favicon.ico')) {
      res.writeHead(204) // no content
    } else {
      res.status(404).json(
        { error: 'Bad request. Check instrucions on ' + mainPageUrl }
      )
    }
  })

  const server = app.listen(serverPort, () => {
    console.log('Listening on port ' + serverPort)
    console.log('To stop server press ' + colors.red.bold('CTRL+C') + '\n')
    console.log('*******************************************************************************')
    console.log('**                             GEO PT API                                    **')
    console.log(`**${Array(16).join(' ')}can be now accessed on ${colors.green.bold('http://localhost:' + serverPort) + Array(17).join(' ')}**`)
    console.log(`**              for instructions see ${colors.cyan.bold(mainPageUrl)}${Array(16).join(' ')}**`)
    console.log('*******************************************************************************')
  })

  // catches CTRL-C
  process.on('SIGINT', function () {
    console.log('Closing http server')
    server.close()
  })

  callback()
}

async.series([prepareServer, startServer],
  function (err) {
    if (err) {
      console.error(err)
      process.exitCode = 1
    } else {
      console.log('Everything done with ' + colors.green.bold('success'))
      debug(regions)
    }
  })
