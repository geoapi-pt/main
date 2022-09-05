const fs = require('fs')
const path = require('path')
const express = require('express')
const rateLimit = require('express-rate-limit')
const exphbs = require('express-handlebars')
const bodyParser = require('body-parser')
const cors = require('cors')
const async = require('async')
const nocache = require('nocache')
const debug = require('debug')('geoptapi:server') // run: DEBUG=geoptapi:server npm start
const commandLineArgs = require('command-line-args')
const colors = require('colors/safe')

const mainPageUrl = 'https://www.geoapi.pt/'
const siteDescription = 'Dados gratuitos e abertos para Portugal sobre regiões administrativas oficiais, georreferenciação e códigos postais'

// define directories
const serverModulesDir = path.join(__dirname, 'js', 'server-modules')
const expressRoutesDir = path.join(serverModulesDir, 'routes')
// import server project modules
const hbsHelpers = require(path.join(serverModulesDir, 'hbsHelpers.js'))
const prepareServerMod = require(path.join(serverModulesDir, 'prepareServer.js'))
const copyFrontEndNpmModules = require(path.join(serverModulesDir, 'copyFrontEndNpmModules.js'))

const argvOptions = commandLineArgs([
  { name: 'port', type: Number },
  { name: 'testStartup', type: Boolean },
  { name: 'rateLimit', type: Boolean }
])

const serverPort = process.env.npm_config_port ||
                   argvOptions.port ||
                   '8080'

console.time('serverTimeToStart')

// fetched from prepareServerMod
// see global objects "regions" and "administrations" on prepareServer.js
let regions, administrations

console.log('Starting. Please wait...')
async.series([copyFrontEndNpmModules, prepareServer, startServer],
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

function startServer (callback) {
  console.log('Server prepared with ' + colors.green.bold('success'))
  console.log('Starting server...')

  const app = express()
  app.use(cors())
  app.use(bodyParser.json())
  app.use(nocache())

  const hbs = exphbs.create({
    extname: '.hbs',
    helpers: hbsHelpers
  })

  app.engine('.hbs', hbs.engine)
  app.set('view engine', '.hbs')
  app.set('views', './views')

  app.use('/', express.static(path.join(__dirname, 'views')))

  // Apply the rate limiting middleware to all requests
  if (argvOptions.rateLimit) {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 15 * 60, // Limit each IP to average 1 request/sec
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false // Disable the `X-RateLimit-*` headers
    })
    app.use(limiter)
  }

  // counter of requests per hour
  let requestsCounterPerHour = 0
  let requestsLastHour = 0
  setInterval(() => {
    requestsLastHour = requestsCounterPerHour
    requestsCounterPerHour = 0
  }, 1000 * 60 * 60)

  // counter of requests per day
  let requestsCounterPerDay = 0
  let requestsLastDay = 0
  setInterval(() => {
    requestsLastDay = requestsCounterPerDay
    requestsCounterPerDay = 0
  }, 1000 * 60 * 60 * 24)

  app.use(function (req, res, next) {
    res.sendData = function (data, input, processedData, template) {
      requestsCounterPerHour++
      requestsCounterPerDay++

      debug(req.accepts(['html', 'json']))

      res.set('Connection', 'close')
      if (req.accepts(['html', 'json']) === 'json' || parseInt(req.query.json)) {
        res.json(data)
      } else {
        res.type('text/html')

        res.render(template || 'home', {
          layout: false,
          siteDescription: siteDescription,
          input: input,
          data: data,
          processedData: processedData
        })
      }
    }
    next()
  })

  app.get('/', function (req, res) {
    res.redirect(mainPageUrl)
  })

  app.get('/shieldsio/requestsLastHour', function (req, res) {
    res.json({
      schemaVersion: 1,
      label: 'Requests on last hour',
      message: requestsLastHour.toString(),
      color: 'orange'
    })
  })

  app.get('/shieldsio/requestsLastDay', function (req, res) {
    res.json({
      schemaVersion: 1,
      label: 'Requests on last day',
      message: requestsLastDay.toString(),
      color: 'orange'
    })
  })

  // Load Express app.get() routers, respective files are stored in js/server-modules/routes/
  try {
    fs.readdirSync(expressRoutesDir).forEach(filename => {
      const router = require(path.join(expressRoutesDir, filename))
      app.get(router.route, function (req, res, next) {
        router.fn(req, res, next, { administrations, regions, serverDir: __dirname, mainPageUrl })
        debug(`Loaded express get from ${filename} with route ${router.route}`)
      })
    })
  } catch (err) {
    console.error(err)
    callback(Error(err))
  }

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
    console.log('**                             GEO API PT                                    **')
    console.log(`**${Array(16).join(' ')}can be now accessed on ${colors.green.bold('localhost:' + serverPort) + Array(24).join(' ')}**`)
    console.log('**                                                                           **')
    console.log('**     Examples:                                                             **')
    console.log(`**${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/gps/40.153687,-8.514602')}${Array(26).join(' ')}**`)
    console.log(`**${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/municipio/Évora')}${Array(34).join(' ')}**`)
    console.log(`**${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/cp/2495-300')}${Array(38).join(' ')}**`)
    console.log(`**${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/cp/1950')}${Array(42).join(' ')}**`)
    console.log('**                                                                           **')
    console.log(`**          for instructions see ${colors.cyan.bold(mainPageUrl)}${Array(23).join(' ')}**`)
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
