const path = require('path')
const express = require('express')
const cors = require('cors')
const PolygonLookup = require('polygon-lookup')
const proj4 = require('proj4')
const async = require('async')
const debug = require('debug')('http')
const commandLineArgs = require('command-line-args')
const colors = require('colors/safe')

const prepareServerMod = require(path.join(__dirname, 'prepareServer.js'))

const serverPort = process.env.npm_config_port ||
                   commandLineArgs([{ name: 'port', type: Number }]).port ||
                   '8080'

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

  app.get('/', function (req, res) {
    try {
      if (req.url.includes('favicon.ico')) {
        res.writeHead(204) // no content
        res.end()
        return
      }

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
            const codigoine = parseInt(freguesia.properties.Dicofre)
            for (let i = 0; i < numberOfParishes; i++) {
              if (codigoine === parseInt(administrations.parishesDetails[i].codigoine)) {
                local.detalhesFreguesia = administrations.parishesDetails[i]
                break // found it, break loop
              }
            }

            // search for details for municipalities (municipios)
            const numberOfMunicipalities = administrations.muncicipalitiesDetails.length
            const concelho = freguesia.properties.Concelho.toLowerCase().trim()
            for (let i = 0; i < numberOfMunicipalities; i++) {
              if (concelho === administrations.muncicipalitiesDetails[i].entidade.toLowerCase().trim()) {
                local.detalhesMunicipio = administrations.muncicipalitiesDetails[i]
                break // found it, break loop
              }
            }
          }

          debug(local)

          res.set('Content-Type', 'application/json')
          res.status(200)
          res.send(JSON.stringify(local))
          res.end()
          return
        }
      }

      debug('Results not found')

      res.status(404)
      res.send({ error: 'Results not found. Coordinates out of scope!' })
      res.end()
    } catch (e) {
      debug('Error on server', e)

      res.status(400)
      res.send({ error: 'Wrong request! Example of good request:  /?lat=40.153687&lon=-8.514602' })
      res.end()
    }
  })

  app.get('/listaDeFreguesias', function (req, res) {
    res.set('Content-Type', 'application/json')
    res.status(200)
    res.send(JSON.stringify(administrations.listOfParishesNames))
    res.end()
  })

  app.get('/listaDeMunicipios', function (req, res) {
    res.set('Content-Type', 'application/json')
    res.status(200)
    res.send(JSON.stringify(administrations.listOfMunicipalitiesNames))
    res.end()
  })

  app.get('/listaDeMunicipiosComFreguesias', function (req, res) {
    res.set('Content-Type', 'application/json')
    res.status(200)
    res.send(JSON.stringify(administrations.listOfMunicipalitiesWithParishes))
    res.end()
  })

  app.use(function (req, res) {
    debug('Not Found')
    res.sendStatus(404)
  })

  app.listen(serverPort, () => {
    console.log(`Server initiated on port ${serverPort}, check for example:`)
    console.log(colors.green(`http://localhost:${serverPort}/?lat=40.153687&lon=-8.514602`))
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
