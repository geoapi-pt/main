const fs = require('fs')
const path = require('path')
const express = require('express')
const rateLimit = require('express-rate-limit')
const exphbs = require('express-handlebars')
const bodyParser = require('body-parser')
const cors = require('cors')
const async = require('async')
const nocache = require('nocache')
const debug = require('debug')('geoapipt:server') // run: DEBUG=geoapipt:server npm start
const commandLineArgs = require('command-line-args')
const colors = require('colors/safe')
const appRoot = require('app-root-path')

const configs = JSON.parse(fs.readFileSync(path.join(appRoot.path, 'configs.json')))
// origin=scheme+host+port, ex: http://example.com:8080
const defaultOrigin = configs.defaultOrigin
const gitProjectUrl = configs.gitProjectUrl
const mainTitle = configs.mainTitle
const siteDescription = configs.description

// define directories
const servicesDir = path.join(__dirname, 'services')
const expressRoutesDir = path.join(__dirname, 'routes')
const middlewaresDir = path.join(__dirname, 'middlewares')
const utilsDir = path.join(__dirname, 'utils')

// import server project modules
const copyFrontEndNpmModules = require(path.join(servicesDir, 'copyFrontEndNpmModules.js'))
const prepareServer = require(path.join(servicesDir, 'prepareServer.js'))
const shutdownServer = require(path.join(servicesDir, 'shutdownServer.js'))
const shieldsioCounters = require(path.join(servicesDir, 'shieldsioCounters.js'))
const consoleApiStartupInfo = require(path.join(servicesDir, 'consoleApiStartupInfo.js'))
const sendDataMiddleware = require(path.join(middlewaresDir, 'sendData.js'))
const hbsHelpers = require(path.join(utilsDir, 'hbsHelpers.js'))

const argvOptions = commandLineArgs([
  { name: 'port', type: Number },
  { name: 'testStartup', type: Boolean },
  { name: 'rateLimit', type: Boolean }
])

const serverPort = process.env.npm_config_port || argvOptions.port || '8080'

console.time('serverTimeToStart')

// fetched from prepareServer module
// see global objects "regions" and "administrations" on prepareServer.js
let regions, administrations

console.log('Starting. Please wait...')
async.series([copyFrontEndNpmModules, prepare, startServer],
  function (err) {
    if (err) {
      console.error(err)
      process.exit(1)
    } else {
      console.log('Everything done with ' + colors.green.bold('success'))
    }
  })

function prepare (callback) {
  prepareServer((err, data) => {
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
  app.set('views', path.join(__dirname, '..', 'views'))

  app.use('/', express.static(path.join(__dirname, '..', 'public')))

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

  shieldsioCounters.setTimers()

  app.use(sendDataMiddleware({ defaultOrigin, gitProjectUrl, mainTitle, siteDescription, shieldsioCounters }))

  app.get('/', function (req, res) {
    res.type('text/html').render('index', {
      layout: false,
      defaultOrigin: defaultOrigin,
      gitProjectUrl: gitProjectUrl,
      pageTitle: mainTitle,
      siteDescription: siteDescription
    })
  })

  shieldsioCounters.loadExpressRoutes(app)

  // Load Express app.get() routers paths, respective files are stored in src/server/routes/
  try {
    fs.readdirSync(expressRoutesDir).forEach(filename => {
      const router = require(path.join(expressRoutesDir, filename))
      app.get(router.route, function (req, res, next) {
        router.fn(req, res, next, { administrations, regions, appRootPath: appRoot.path, gitProjectUrl })
        debug(`Loaded express get from ${filename} with route ${router.route}`)
      })
    })
  } catch (err) {
    console.error(err)
    callback(Error(err))
  }

  app.use(function (req, res) {
    res.status(404).sendData({ error: 'Bad request. Check instrucions on ' + gitProjectUrl })
  })

  const server = app.listen(serverPort, () => {
    // if this is a test to merely test the start up of the server
    if (argvOptions.testStartup) {
      console.log('This was just to test the startup of the server, exiting now...')
      shutdownServer(null, server)
      return
    }

    console.timeEnd('serverTimeToStart')

    consoleApiStartupInfo({ serverPort, gitProjectUrl })

    if (process.send) {
      process.send('ready') // very important, trigger to PM2 that app is ready
    }

    callback()
  })

  // gracefully exiting upon CTRL-C or when PM2 stops the process
  process.on('SIGINT', (signal) => shutdownServer(signal, server))
  process.on('SIGTERM', (signal) => shutdownServer(signal, server))
}
