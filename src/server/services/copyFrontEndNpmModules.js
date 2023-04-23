const path = require('path')
const fse = require('fs-extra')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:copyFrontEndNpmModules') // run: DEBUG=geoapipt:copyFrontEndNpmModules npm start

module.exports = copyFrontEndNpmModules

function copyFrontEndNpmModules (callback) {
  debug('Copying frontend npm modules files')
  // module is NPM module name
  // dir is the directory relative to module root directory
  const copyModule = function (module, dir) {
    const srcDir = path.join(appRoot.path, 'node_modules', module, dir)
    const destDir = path.join(appRoot.path, 'src', 'public', 'lib', module)
    fse.copySync(srcDir, destDir, { overwrite: true })
    debug(`Copied files from ${path.relative(appRoot.path, srcDir)} to ${path.relative(appRoot.path, destDir)}`)
  }

  try {
    copyModule('leaflet', 'dist') // from node_modules/leaflet/dist -> views/lib/leaflet
    copyModule('leaflet-contextmenu', 'dist') // from node_modules/leaflet/dist -> views/lib/leaflet
    copyModule('leaflet-contextmenu', 'dist')
    copyModule('topojson-server', 'dist')
    copyModule('topojson-client', 'dist')
    callback()
  } catch (err) {
    console.error(err)
    callback(Error('Error copying front end files'))
  }
}
