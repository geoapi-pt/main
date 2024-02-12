/* module to fetch configuration values
   values can be fetched either by config.json or by ENV variables
   the latter have priority */

const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:configs')

const configsFromFile = JSON.parse(fs.readFileSync(path.join(appRoot.path, 'configs.json')))

const configs = {}

for (const key in configsFromFile) {
  if (!key.startsWith('__')) {
    configs[key] = process.env['geoapipt_' + key] || configsFromFile[key]
  }
}

debug('configs', configs)
module.exports = configs
