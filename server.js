const path = require('path')
const express = require('express')
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

  app.get('/', function (req, res) {
    if (req.url.includes('favicon.ico')) {
      res.writeHead(204) // no content
      res.end()
      return
    }
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
      res.send({ error: 'Wrong request! Example of good request: /gps?lat=40.153687&lon=-8.514602' })
      res.end()
    }
  })

  app.get(['/municipio', '/municipios'], function (req, res) {
    // no parameters, list of municipalities
    if (Object.keys(req.query).length === 0) {
      res.set('Content-Type', 'application/json')
      res.status(200)
      res.send(JSON.stringify(administrations.listOfMunicipalitiesNames))
      res.end()
      return
    }

    if (Object.keys(req.query).length === 1 && req.query.nome) {
      const nameOfMunicipality = req.query.nome.toLowerCase().trim()

      for (const municipality of administrations.muncicipalitiesDetails) {
        if (nameOfMunicipality === municipality.nome.toLowerCase().trim()) {
          res.set('Content-Type', 'application/json')
          res.status(200)
          res.send(JSON.stringify(municipality))
          res.end()
          return
        }
      }

      res.status(404)
      res.send({ error: 'Municipality not found!' })
      res.end()
      return
    }

    res.status(400)
    res.send({ error: 'Bad request. Check instrucions on ' + mainPageUrl })
    res.end()
  })

  app.get(['/freguesia', '/freguesias'], function (req, res) {
    // no parameters, list of parishes
    if (Object.keys(req.query).length === 0) {
      res.set('Content-Type', 'application/json')
      res.status(200)
      res.send(JSON.stringify(administrations.listOfParishesNames))
      res.end()
      return
    }

    if (Object.keys(req.query).length === 1 && req.query.nome) {
      const nameOfParish = req.query.nome.toLowerCase().trim()

      const parishes = []
      for (const parish of administrations.parishesDetails) {
        const name1 = parish.nome.toLowerCase().trim()
        const name2 = parish.nomecompleto.toLowerCase().trim()
        const name3 = parish.nomecompleto2.toLowerCase().trim()
        if (nameOfParish === name1 || nameOfParish === name2 || nameOfParish === name3) {
          parishes.push(parish)
        }
      }

      if (parishes.length) {
        res.set('Content-Type', 'application/json')
        res.status(200)
        res.send(JSON.stringify(parishes))
        res.end()
      } else {
        res.status(404)
        res.send({ error: 'Parish not found!' })
        res.end()
      }

      return
    }

    res.status(400)
    res.send({ error: 'Bad request. Check instrucions on ' + mainPageUrl })
    res.end()
  })

  app.get('/municipiosComFreguesias', function (req, res) {
    res.set('Content-Type', 'application/json')
    res.status(200)
    res.send(JSON.stringify(administrations.listOfMunicipalitiesWithParishes))
    res.end()
  })

  app.use(function (req, res) {
    res.status(404)
    res.send({ error: 'Bad request. Check instrucions on ' + mainPageUrl })
    res.end()
  })

  const server = app.listen(serverPort, () => {
    console.log('Listening on port ' + serverPort)
    console.log('To stop server press ' + colors.red.bold('CTRL+C') + '\n')
    console.log('*******************************************************************************')
    console.log('**                             GEO PT API                                    **')
    console.log(`**${Array(16).join(' ')}can be now accessed on ${colors.green.bold('http://localhost:' + serverPort) + Array(17).join(' ')}**`)
    console.log(`**        for instructions see ${colors.cyan.bold(mainPageUrl)}         **`)
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
