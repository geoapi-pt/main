const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const PolygonLookup = require('polygon-lookup')
const proj4 = require('proj4')
const async = require('async')
const debug = require('debug')('server') // run: DEBUG=server npm start
const commandLineArgs = require('command-line-args')
const colors = require('colors/safe')

const mainPageUrl = 'https://www.geoptapi.org/'

const prepareServerMod = require(path.join(__dirname, 'prepareServer.js'))
const normalizeName = prepareServerMod.normalizeName

const preparePostalCodesMod = require(path.join(__dirname, 'preparePostalCodes.js'))

const argvOptions = commandLineArgs([
  { name: 'port', type: Number },
  { name: 'testStartup', type: Boolean }
])

const serverPort = process.env.npm_config_port ||
                   argvOptions.port ||
                   '8080'

console.time('serverTimeToStart')

// fetched from prepareServerMod
// see global objects "regions" and "administrations" on prepareServer.js
let regions, administrations, postalCodes

async.series([prepareServer, preparePostalCodes, startServer],
  function (err) {
    if (err) {
      console.error(err)
      process.exit(1)
    } else {
      console.log('Everything done with ' + colors.green.bold('success'))
      debug(regions)
    }
  })

function prepareServer (callback) {
  prepareServerMod.prepare((err, data) => {
    if (err) {
      callback(Error(err))
    } else {
      regions = data.regions
      administrations = data.administrations
      callback()
    }
  })
}

function preparePostalCodes (callback) {
  preparePostalCodesMod.prepare((err, data) => {
    if (err) {
      callback(Error(err))
    } else {
      postalCodes = data
      callback()
    }
  })
}

function startServer (callback) {
  console.log('Server prepared with ' + colors.green.bold('success'))
  console.log('Starting server...')

  const app = express()
  app.use(cors())
  app.use(bodyParser.json())

  app.get('/', function (req, res) {
    res.redirect(mainPageUrl)
  })

  app.get('/gps', function (req, res) {
    try {
      debug('new query: ', req.query)
      debug(req.headers, req.accepts(['html', 'json']))

      // ### validate request query ###
      // query parameters must be "lat and lon" or "lat, lon and detalhes"
      const parameters = Object.keys(req.query)
      const numberOfParameters = parameters.length
      let isQueryValid = numberOfParameters === 2 || numberOfParameters === 3
      isQueryValid = isQueryValid && parameters.includes('lat') && parameters.includes('lon')
      if (numberOfParameters === 3) { isQueryValid = isQueryValid && parameters.includes('detalhes') }
      if (!isQueryValid) {
        res.status(404).json({ error: 'Bad request for /gps. Check instrucions on ' + mainPageUrl })
        return
      }
      // check that lat and lon are valid numbers
      const isNumeric = function (str) {
        if (typeof str !== 'string') return false
        return !isNaN(str) && !isNaN(parseFloat(str))
      }
      if (!isNumeric(req.query.lat) || !isNumeric(req.query.lon)) {
        res.status(404).json({ error: `Parameters lat and lon must be a valid number on ${req.originalUrl}` })
        return
      }
      // ### request is valid from here ###

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
            distrito: freguesia.properties.Distrito,
            ilha: freguesia.properties.Ilha
          }

          if (isDetails) {
            // search for details for parishes by código INE
            const numberOfParishes = administrations.parishesDetails.length
            // regex to remove leading zeros
            const codigoine = (freguesia.properties.Dicofre || freguesia.properties.DICOFRE).replace(/^0+/, '')
            for (let i = 0; i < numberOfParishes; i++) {
              if (codigoine === administrations.parishesDetails[i].codigoine.replace(/^0+/, '')) {
                local.detalhesFreguesia = administrations.parishesDetails[i]
                break // found it, break loop
              }
            }

            // search for details for municipalities by name
            const numberOfMunicipalities = administrations.municipalitiesDetails.length
            const concelho = normalizeName(freguesia.properties.Concelho)
            for (let i = 0; i < numberOfMunicipalities; i++) {
              if (concelho === normalizeName(administrations.municipalitiesDetails[i].nome)) {
                local.detalhesMunicipio = administrations.municipalitiesDetails[i]
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

  app.get(['/municipio', '/municipios'], function (req, res, next) {
    debug(req.path, req.query, req.headers, req.accepts(['html', 'json']))

    if (Object.keys(req.query).length === 0) {
      res.status(200).json(administrations.listOfMunicipalitiesNames)
      return
    }

    // ### validate request query ###
    // check if all parameters of request exist in municipalitiesDetails
    const keysOfMunicipalitiesDetails = administrations.keysOfMunicipalitiesDetails
    const invalidParameters = []
    for (const param in req.query) {
      if (!req.query[param] || !keysOfMunicipalitiesDetails.includes(param)) {
        invalidParameters.push(param)
      }
    }
    if (invalidParameters.length) {
      res.status(404).json({ error: `These parameters are invalid or don't exist for ${req.path}: ${invalidParameters}` })
      return
    }
    // ### request query is valid from here ###

    const { nome } = req.query
    let results = [...administrations.municipalitiesDetails]

    if (nome) {
      const municipalityToFind = normalizeName(nome)
      results = results.filter(
        municipality => normalizeName(municipality.nome) === municipalityToFind
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

    if (results.length > 1) {
      res.status(200).json(results)
    } else if (results.length === 1) {
      res.status(200).json(results[0])
    } else {
      res.status(404).json({ error: 'Municipality not found!' })
    }
  })

  app.get(['/freguesia', '/freguesias'], function (req, res) {
    debug(req.path, req.query, req.headers, req.accepts(['html', 'json']))

    // no parameters, list of parishes
    if (Object.keys(req.query).length === 0) {
      res.status(200).json(administrations.listOfParishesNames)
      return
    }

    // ### validate request query ###
    // check if all parameters of request exist in parishesDetails
    const keysOfParishesDetails = administrations.keysOfParishesDetails
    const invalidParameters = []
    for (const param in req.query) {
      if (!req.query[param] || !keysOfParishesDetails.includes(param)) {
        invalidParameters.push(param)
      }
    }
    if (invalidParameters.length) {
      res.status(404).json({ error: `These parameters are invalid or don't exist for for ${req.path}: ${invalidParameters}` })
      return
    }
    // ### request query is valid from here ###

    const { nome, municipio } = req.query
    let results = [...administrations.parishesDetails]

    if (nome) {
      const parishToFind = normalizeName(nome)
      results = results.filter(parish => {
        const name0 = normalizeName(parish.nome)
        const name1 = normalizeName(parish.nomecompleto)
        const name2 = normalizeName(parish.nomecompleto2)
        const name3 = normalizeName(parish.nomecompleto3)
        return parishToFind === name0 || parishToFind === name1 || parishToFind === name2 || parishToFind === name3
      })
    }

    if (municipio) {
      const municipalityToFind = normalizeName(municipio)
      results = results.filter(
        parish => normalizeName(parish.municipio) === municipalityToFind
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

    if (results.length > 1) {
      res.status(200).json(results)
    } else if (results.length === 1) {
      res.status(200).json(results[0])
    } else {
      res.status(404).json({ error: 'Parish not found!' })
    }
  })

  // /municipio(s)/freguesia(s)
  app.get(/^\/municipios?\/freguesias?$/, function (req, res) {
    res.status(200).json(administrations.listOfMunicipalitiesWithParishes)
  })

  // Path for Postal Codes
  // /cp/XXXX, /cp/XXXXYYY or /cp/XXXX-YYY
  app.get('/cp/:cp', function (req, res) {
    debug(req.path, req.query, req.headers, req.accepts(['html', 'json']))

    const cp = req.params.cp

    // asserts postal code is XXXX, XXXXYYY or XXXX-YYY
    if (/^\d{4}(-?\d{3})?$/.test(cp)) {
      const cleanCp = cp.replace(/-/, '')
      const cp4 = cleanCp.slice(0, 4) // first 4 digits of CP
      const cp3 = cleanCp.slice(4, 7) // last 3 digits of CP or '' when not available

      let results
      if (cp3) { // last 3 digits of CP are available
        results = postalCodes.filter(el => el.CP4 === cp4 && el.CP3 === cp3)
      } else {
        results = postalCodes.filter(el => el.CP4 === cp4)
      }

      // clean empty fields
      results.forEach((el) => {
        for (const key in el) {
          if (!el[key]) delete el[key]
        }
      })

      if (results.length > 1) {
        res.status(200).json(results)
      } else if (results.length === 1) {
        res.status(200).json(results[0])
      } else {
        res.status(404).json({ error: 'Postal Code not found!' })
      }
    } else {
      res.status(404).json({ error: 'Postal Code format must be /cp/XXXX, /cp/XXXXYYY or /cp/XXXX-YYY' })
    }
  })

  app.use(function (req, res) {
    if (req.url.includes('favicon.ico')) {
      res.writeHead(204) // no content
    } else {
      res.status(404).json({ error: 'Bad request. Check instrucions on ' + mainPageUrl })
    }
  })

  const server = app.listen(serverPort, () => {
    // if this is a test to merely test the start up of the server
    if (argvOptions.testStartup) {
      console.log('This was just to test the startup of the server, exiting now...')
      gracefulShutdown()
      return
    }

    console.timeEnd('serverTimeToStart')

    console.log('Listening on port ' + serverPort)
    console.log('To stop server press ' + colors.red.bold('CTRL+C') + '\n')
    console.log('*******************************************************************************')
    console.log('**                             GEO PT API                                    **')
    console.log(`**${Array(16).join(' ')}can be now accessed on ${colors.green.bold('http://localhost:' + serverPort) + Array(17).join(' ')}**`)
    console.log(`**              for instructions see ${colors.cyan.bold(mainPageUrl)}${Array(16).join(' ')}**`)
    console.log('*******************************************************************************')

    if (process.send) {
      process.send('ready') // very important, trigger to PM2 that app is ready
    }
  })

  // gracefully exiting upon CTRL-C or when PM2 stops the process
  process.on('SIGINT', gracefulShutdown)
  process.on('SIGTERM', gracefulShutdown)
  function gracefulShutdown (signal) {
    if (signal) {
      console.log(`Received signal ${signal}`)
    }
    console.log('Gracefully closing http server')

    try {
      server.close(function (err) {
        if (!err) {
          console.log('http server closed successfully. Exiting!')
        }
        process.exit(err ? 1 : 0)
      })
    } catch (err) {
      console.error('There was an error')
      setTimeout(() => process.exit(1), 500)
    }
  }

  callback()
}
