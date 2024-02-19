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
const commandLineUsage = require('command-line-usage')
const commandLineArgs = require('command-line-args')
const colors = require('colors/safe')
const appRoot = require('app-root-path')

// define directories
const servicesDir = path.join(__dirname, 'services')
const expressRoutesDir = path.join(__dirname, 'routes')
const middlewaresDir = path.join(__dirname, 'middlewares')
const utilsDir = path.join(__dirname, 'utils')

// get configuration variables
const configs = require(path.join(servicesDir, 'getConfigs.js'))
// origin=scheme+host+port, ex: http://example.com:8080
const gitProjectUrl = configs.gitProjectUrl
const siteDescription = configs.description
const apiDocsOrigin = configs.apiDocsOrigin

// import server project modules
const getRegionsAndAdmins = require(path.join(servicesDir, 'getRegionsAndAdmins.js'))
const shutdownServer = require(path.join(servicesDir, 'shutdownServer.js'))
const shieldsioCounters = require(path.join(servicesDir, 'shieldsioCounters.js'))
const consoleApiStartupInfo = require(path.join(servicesDir, 'consoleApiStartupInfo.js'))
const sendDataMiddleware = require(path.join(middlewaresDir, 'sendData.js'))
const errorMiddleware = require(path.join(middlewaresDir, 'error.js'))
const hbsHelpers = require(path.join(utilsDir, 'hbsHelpers.js'))
const isResponseJson = require(path.join(utilsDir, 'isResponseJson.js'))

const cliOptions = [
  { name: 'port', type: Number, description: `local port to run the sever, default is ${configs.defaultHttpPort}` },
  { name: 'buildFeAssets', type: Boolean, description: 'build front-end assets before server startup' },
  { name: 'testStartup', type: Boolean, description: 'just test server startup, exit afterwards' },
  { name: 'rateLimit', type: Boolean, description: 'activate rate limiter for requests' },
  { name: 'help', type: Boolean, description: 'print this help' }
]
const cliUsageObj = [
  { header: 'geoapipt', content: `HTTP server for the GEO API PT: {italic ${siteDescription}}. For more information see ${gitProjectUrl}` },
  { header: 'Options', optionList: cliOptions },
  {
    header: 'Examples',
    content: [
      { desc: `1. Start server on port ${configs.defaultHttpPort} without rate limiter.`, example: '$ npm start' },
      { desc: '2. Start server on port 9090 with rate limiter activated.', example: '$ npm start -- --port 9090 --rateLimit' },
      { desc: '3. Test server startup.', example: '$ npm start -- --testStartup' }
    ]
  }
]
const argvOptions = commandLineArgs(cliOptions)
const cliUsage = commandLineUsage(cliUsageObj)

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

  app.use(express.text())
  app.use(express.json())

  const hbs = exphbs.create({
    extname: '.hbs',
    helpers: hbsHelpers
  })

  app.engine('.hbs', hbs.engine)
  app.set('view engine', '.hbs')
  app.set('views', path.join(__dirname, '..', 'views'))

  // only serve static files for the HTML request
  app.use('/', (req, res, next) => {
    if (isResponseJson(req)) {
      next()
    } else {
      express.static(path.join(__dirname, '..', 'public', 'dist'), { etag: false })(req, res, next)
    }
  })

  app.use(sendDataMiddleware({ configs, shieldsioCounters }))

  // Apply the rate limiting middleware to all requests
  let limiter
  if (argvOptions.rateLimit) {
    limiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 120, // max requests per each IP in windowMs
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      message: 'You have reached the limit of requests, please contact joao.pimentel.ferreira@gmail.com for unlimited use of this API and/or running it in your own machine (self-hosting)'
    })
  }

  shieldsioCounters.setTimers()

  app.get('/', function (req, res) {
    res.status(200).sendData({
      data: {
        bbox: regions.cont.geojson.bbox,
        keysMaping: JSON.parse(fs.readFileSync(path.join(__dirname, 'utils', 'keysMaping.json')))
      },
      template: 'index'
    })
  })

  shieldsioCounters.loadExpressRoutes(app)

  // Load Express app.get() routers paths, respective files are stored in src/server/routes/
  try {
    fs.readdirSync(expressRoutesDir).forEach(filename => {
      const router = require(path.join(expressRoutesDir, filename))
      const routeFn = (req, res, next) => {
        router.fn(req, res, next, { administrations, regions, appRootPath: appRoot.path, gitProjectUrl })
      }
      if (argvOptions.rateLimit) {
        app.get(router.route, limiter, routeFn)
      } else {
        app.get(router.route, routeFn)
      }
      debug(`Loaded express get from ${filename} with route ${router.route}`)
    })
  } catch (err) {
    console.error(err)
    callback(Error(err))
  }

  app.use(errorMiddleware({ apiDocsOrigin }))

  app.use((req, res) => {
    res.status(404).sendData({ error: `Caminho não encontrado: ${req.originalUrl}; ler instruções em ${apiDocsOrigin}` })
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
