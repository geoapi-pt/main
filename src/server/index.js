const fs = require('fs')
const path = require('path')
const express = require('express')
const exphbs = require('express-handlebars')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const cors = require('cors')
const async = require('async')
const nocache = require('nocache')
const debug = require('debug')('geoapipt:server') // run: DEBUG=geoapipt:server npm start
const colors = require('colors/safe')
const appRoot = require('app-root-path')
const expressIsGoogleCrawler = require('express-is-googlecrawler')

// define directories
const servicesDir = path.join(__dirname, 'services')
const expressRoutesDir = path.join(__dirname, 'routes')
const middlewaresDir = path.join(__dirname, 'middlewares')
const utilsDir = path.join(__dirname, 'utils')

// get configuration variables
const configs = require(path.join(servicesDir, 'getConfigs.js'))
// origin=scheme+host+port, ex: http://example.com:8080
const defaultOrigin = configs.defaultOrigin

// import server project modules
const getRegionsAndAdmins = require(path.join(servicesDir, 'getRegionsAndAdmins.js'))
const getAltitude = require(path.join(servicesDir, 'getAltitude.js'))
const shutdownServer = require(path.join(servicesDir, 'shutdownServer.js'))
const counters = require(path.join(servicesDir, 'counters.js'))
const consoleApiStartupInfo = require(path.join(servicesDir, 'consoleApiStartupInfo.js'))
// middlewares
const sendDataMiddleware = require(path.join(middlewaresDir, 'sendData.js'))
const staticFiles = require(path.join(middlewaresDir, 'staticFiles.js'))
const rateLimiter = require(path.join(middlewaresDir, 'rateLimiter.js'))
const errorMiddleware = require(path.join(middlewaresDir, 'error.js'))
// utilities
const hbsHelpers = require(path.join(utilsDir, 'hbsHelpers.js'))
const { argvOptions, cliUsage } = require(path.join(utilsDir, 'cliUsage.js'))

// mapping between keys and respective description
let keysMapping = JSON.parse(fs.readFileSync(path.join(utilsDir, 'keysMaping.json')))
const censosKeysMaping = JSON.parse(fs.readFileSync(path.join(utilsDir, 'censosKeysMaping.json')))
keysMapping = keysMapping.concat(censosKeysMaping)

if (argvOptions.help) {
  console.log(cliUsage)
  process.exit()
}

const serverPort = process.env.npm_config_port || argvOptions.port || configs.defaultHttpPort

console.time('serverTimeToStart')

// fetched from getRegionsAndAdmins module
// see global objects "regions" and "administrations" on getRegionsAndAdmins.js
let regions, administrations

console.log('Starting. Please wait...')

const steps = [prepare, startServer]
if (argvOptions.buildFeAssets) {
  const webpack = require(path.join(servicesDir, 'webpack.js'))
  steps.unshift(webpack)
}

async.series(steps,
  function (err) {
    if (err) {
      console.error(err)
      process.exit(1)
    } else {
      console.log('Everything done with ' + colors.green.bold('success'))
    }
  })

function prepare (callback) {
  getRegionsAndAdmins((err, data) => {
    if (err) {
      callback(Error(err))
    } else {
      regions = data.regions
      administrations = data.administrations

      getAltitude.init((err) => {
        if (err) {
          callback(Error(err))
        } else {
          callback()
        }
      })
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
  app.use(cookieParser())

  app.use(express.text())
  app.use(express.json())
  app.use(expressIsGoogleCrawler)

  const hbs = exphbs.create({
    extname: '.hbs',
    helpers: hbsHelpers
  })

  app.engine('.hbs', hbs.engine)
  app.set('view engine', '.hbs')
  app.set('views', path.join(__dirname, '..', 'views'))
  app.set('trust proxy', 1)

  staticFiles(app)
  app.use(sendDataMiddleware({ configs, counters }))

  counters.setTimers()

  let dbPool
  if (argvOptions.rateLimit) {
    dbPool = rateLimiter.init({ defaultOrigin })
  }

  app.get('/', (req, res) => {
    res.status(200).sendData({
      data: {
        bbox: regions.cont.geojson.bbox,
        keysMaping: keysMapping
      },
      template: 'index'
    })
  })

  app.get('/self-hosting', (req, res) => {
    res.status(200).sendData({ template: 'selfHosting' })
  })
  app.get('/request-api-key', (req, res) => {
    res.status(200).sendData({ template: 'requestApiKey' })
  })

  if (argvOptions.rateLimit) {
    // a path to be able to receive response headers on front end
    app.get('/rate_limiter_test_path', rateLimiter.middleware('rate_limiter_test_path'), (req, res) => {
      res.send()
    })
  }

  counters.loadExpressRoutes(app)

  // Load Express app.get() routers paths, respective files are stored in src/server/routes/
  try {
    fs.readdirSync(expressRoutesDir).forEach(filename => {
      const router = require(path.join(expressRoutesDir, filename))
      const routeFn = (req, res, next) => {
        router.fn(req, res, next, { administrations, regions, appRootPath: appRoot.path, defaultOrigin })
      }
      if (argvOptions.rateLimit) {
        // 'route' as a file in directory src/server/routes but without extension
        const route = path.parse(filename).name
        app.get(router.route, rateLimiter.middleware(route), routeFn)
      } else {
        app.get(router.route, routeFn)
      }
      debug(`Loaded express get from ${filename} with route ${router.route}`)
    })
  } catch (err) {
    console.error(err)
    callback(Error(err))
  }

  app.use(errorMiddleware())

  app.use((req, res) => {
    res.status(404).sendData({ error: `Caminho não encontrado: ${req.originalUrl}; ler instruções em ${req.get('host')}/docs` })
  })

  const server = app.listen(serverPort, () => {
    // if this is a test to merely test the start up of the server
    if (argvOptions.testStartup) {
      console.log('This was just to test the startup of the server, exiting now...')
      shutdownServer(null, server)
      return
    }

    console.timeEnd('serverTimeToStart')

    consoleApiStartupInfo({ serverPort })

    if (process.send) {
      process.send('ready') // very important, trigger to PM2 that app is ready
    }

    callback()
  })

  // gracefully exiting upon CTRL-C or when PM2 stops the process
  process.on('SIGINT', (signal) => shutdownServer(signal, server, dbPool))
  process.on('SIGTERM', (signal) => shutdownServer(signal, server, dbPool))
}
