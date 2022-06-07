const path = require('path')
const express = require('express')
const { engine } = require('express-handlebars')
const bodyParser = require('body-parser')
const cors = require('cors')
const PolygonLookup = require('polygon-lookup')
const proj4 = require('proj4')
const async = require('async')
const nocache = require('nocache')
const debug = require('debug')('server') // run: DEBUG=server npm start
const commandLineArgs = require('command-line-args')
const colors = require('colors/safe')

const { obj2html } = require(path.join(__dirname, 'functions.js'))

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
    }
  })

function prepareServer (callback) {
  prepareServerMod.prepare((err, data) => {
    if (err) {
      callback(Error(err))
    } else {
      regions = data.regions
      debug(regions)
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
  app.use(nocache())

  app.engine('.hbs', engine({ extname: '.hbs' }))
  app.set('view engine', '.hbs')
  app.set('views', './views')

  app.use('/css', express.static(path.join(__dirname, 'views', 'css')))
  app.use('/fonts', express.static(path.join(__dirname, 'views', 'fonts')))

  app.use(function (req, res, next) {
    res.sendData = function (data, input) {
      debug(req.accepts(['html', 'json']))

      res.set('Connection', 'close')
      if (req.accepts(['html', 'json']) === 'json' || parseInt(req.query.json)) {
        res.json(data)
      } else {
        res.type('text/html')

        res.render('home', {
          layout: false,
          data: obj2html(data),
          input: input ? obj2html(input) : ''
        })
      }
    }
    next()
  })

  app.get('/', function (req, res) {
    res.redirect(mainPageUrl)
  })

  app.get(['/gps', '/gps/:lat?,:lon?'], function (req, res) {
    try {
      debug('new query: ', req.query)
      debug(req.headers, req.params)

      // check that lat and lon are valid numbers
      const isNumeric = function (str) {
        if (typeof str !== 'string') return false
        return !isNaN(str) && !isNaN(parseFloat(str))
      }

      // use url format /gps/lat,lon
      if (isNumeric(req.params.lat) && isNumeric(req.params.lon)) {
        req.query.lat = req.params.lat
        req.query.lon = req.params.lon
      }

      // ### validate request query ###
      // query parameters must be "lat and lon" or "lat, lon and detalhes"
      const parameters = Object.keys(req.query)
      const isQueryValid = parameters.includes('lat') && parameters.includes('lon')
      if (!isQueryValid) {
        res.status(404).sendData({ error: 'Bad request for /gps. Check instrucions on ' + mainPageUrl })
        return
      }

      if (!isNumeric(req.query.lat) || !isNumeric(req.query.lon)) {
        res.status(404).sendData({ error: `Parameters lat and lon must be a valid number on ${req.originalUrl}` })
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

          res.status(200).sendData(
            local,
            { latitude: lat, longitude: lon } // inform user of input in case of text/html
          )
          return
        }
      }

      debug('Results not found')

      res.status(404).sendData({ error: 'Results not found. Coordinates out of scope!' })
    } catch (e) {
      debug('Error on server', e)

      res.status(400).sendData(
        { error: 'Wrong request! Example of good request: /gps?lat=40.153687&lon=-8.514602' }
      )
    }
  })

  app.get('/munic(i|í)pios?/:municipality?/freguesias', function (req, res, next) {
    debug(req.path, req.query, req.headers)

    if (!req.params.municipality) {
      next()
      return
    }

    const municipality = req.params.municipality

    const results = administrations.listOfMunicipalitiesWithParishes
      .filter(el => normalizeName(el.nome) === normalizeName(municipality))

    if (results.length > 1) {
      res.status(200).sendData(results, 'Lista de freguesias para municípios escolhidos')
    } else if (results.length === 1) {
      res.status(200).sendData(results[0], { Município: results[0].nome })
    } else {
      res.status(404).sendData({ error: `Município ${municipality} não encontrado!` })
    }
  })

  app.get('/munic(i|í)pios?/:municipality?', function (req, res, next) {
    debug(req.path, req.query, req.headers)

    if (req.params.municipality === 'freguesia' || req.params.municipality === 'freguesias') {
      next()
      return
    }

    // if name is not provided in query, consider parameter from url instead
    // example /municipio/Évora
    if (req.params.municipality && !req.query.nome) {
      req.query.nome = req.params.municipality
    }

    const numberOfQueryVars = Object.keys(req.query).length
    if (numberOfQueryVars === 0 || (numberOfQueryVars === 1 && parseInt(req.query.json))) {
      res.status(200).sendData(administrations.listOfMunicipalitiesNames, 'Lista de todos os municípios')
      return
    }

    // ### validate request query ###
    // check if all parameters of request exist in municipalitiesDetails
    const allowableParams = administrations.keysOfMunicipalitiesDetails.concat('json')
    const invalidParameters = []
    for (const param in req.query) {
      if (!req.query[param] || !allowableParams.includes(param)) {
        invalidParameters.push(param)
      }
    }
    if (invalidParameters.length) {
      res.status(404).sendData({ error: `These parameters are invalid or don't exist for ${req.path}: ${invalidParameters}` })
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
      res.status(200).sendData(results, 'Lista de municípios')
    } else if (results.length === 1) {
      res.status(200).sendData(results[0], { Município: results[0].nome })
    } else {
      res.status(404).sendData({ error: 'Município não encontrado!' })
    }
  })

  app.get('/freguesias?/:parish?', function (req, res) {
    debug(req.path, req.query, req.headers)

    // if name is not provided in query, consider parameter from url instead
    // example /freguesia/serzedelo
    if (req.params.parish && !req.query.nome) {
      req.query.nome = req.params.parish
    }

    // no parameters, list of parishes
    const numberOfQueryVars = Object.keys(req.query).length
    if (numberOfQueryVars === 0 || (numberOfQueryVars === 1 && parseInt(req.query.json))) {
      res.status(200).sendData(administrations.listOfParishesNames)
      return
    }

    // ### validate request query ###
    // check if all parameters of request exist in parishesDetails
    const allowableParams = administrations.keysOfParishesDetails.concat('json')
    const invalidParameters = []
    for (const param in req.query) {
      if (!req.query[param] || !allowableParams.includes(param)) {
        invalidParameters.push(param)
      }
    }
    if (invalidParameters.length) {
      res.status(404).sendData({ error: `These parameters are invalid or don't exist for for ${req.path}: ${invalidParameters}` })
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
      res.status(200).sendData(results, 'Lista de freguesias')
    } else if (results.length === 1) {
      res.status(200).sendData(results[0], { Freguesia: `${results[0].nomecompleto} (${results[0].municipio})` })
    } else {
      res.status(404).sendData({ error: 'Freguesia não encontrada!' })
    }
  })

  // /municipio(s)/freguesia(s)
  app.get(/^\/municipios?\/freguesias?$/, function (req, res) {
    debug(req.path, req.query, req.headers)
    res.status(200).sendData(administrations.listOfMunicipalitiesWithParishes, 'Lista de municípios com as respetivas freguesias')
  })

  // Path for Postal Codes
  // /cp/XXXX, /cp/XXXXYYY or /cp/XXXX-YYY
  app.get('/cp/:cp', function (req, res) {
    debug(req.path, req.query, req.headers)

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

      // present also the input in case of text/html rendering
      const input = { 'Código Postal': cp4 + (cp3 ? '-' + cp3 : '') }

      if (results.length > 1) {
        res.status(200).sendData(results, input)
      } else if (results.length === 1) {
        res.status(200).sendData(results[0], input)
      } else {
        res.status(404).sendData({ error: 'Postal Code not found!' })
      }
    } else {
      res.status(404).sendData({ error: 'Postal Code format must be /cp/XXXX, /cp/XXXXYYY or /cp/XXXX-YYY' })
    }
  })

  app.use(function (req, res) {
    if (req.url.includes('favicon.ico')) {
      res.writeHead(204) // no content
    } else {
      res.status(404).sendData({ error: 'Bad request. Check instrucions on ' + mainPageUrl })
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
    console.log(`**${Array(16).join(' ')}can be now accessed on ${colors.green.bold('localhost:' + serverPort) + Array(24).join(' ')}**`)
    console.log('**                                                                           **')
    console.log('**     Examples:                                                             **')
    console.log(`**${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/gps?lat=40.153687&lon=-8.514602')}${Array(18).join(' ')}**`)
    console.log(`**${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/municipio?nome=Évora')}${Array(29).join(' ')}**`)
    console.log(`**${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/cp/2495-300')}${Array(38).join(' ')}**`)
    console.log('**                                                                           **')
    console.log(`**              for instructions see ${colors.cyan.bold(mainPageUrl)}${Array(16).join(' ')}**`)
    console.log('*******************************************************************************')

    if (process.send) {
      process.send('ready') // very important, trigger to PM2 that app is ready
    }

    callback()
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
}
