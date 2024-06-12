const path = require('path')
const appRoot = require('app-root-path')
const commandLineUsage = require('command-line-usage')
const commandLineArgs = require('command-line-args')

const configs = require(path.join(appRoot.path, 'src', 'server', 'services', 'getConfigs.js'))
const siteDescription = configs.description
const defaultOrigin = configs.defaultOrigin

const cliOptions = [
  { name: 'port', type: Number, description: `local port to run the sever, default is ${configs.defaultHttpPort}` },
  { name: 'buildFeAssets', type: Boolean, description: 'build front-end assets before server startup' },
  { name: 'testStartup', type: Boolean, description: 'just test server startup, exit afterwards' },
  { name: 'rateLimit', type: Boolean, description: 'activate rate limiter for requests' },
  { name: 'help', type: Boolean, description: 'print this help' }
]
const cliUsageObj = [
  { header: 'geoapi.pt', content: `HTTP server for the GEO API PT: {italic ${siteDescription}}. For more information see ${defaultOrigin}/docs` },
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

module.exports = { argvOptions, cliUsage }
