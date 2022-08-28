const path = require('path')
const fse = require('fs-extra')

const rootDir = path.join(__dirname, '..', '..')

module.exports = copyFrontEndNpmModules

function copyFrontEndNpmModules (callback) {
  console.log('Copying frontend npm modules files')
  // module is NPM module name
  // dir is the directory relative to module root directory
  const copyModule = function (module, dir) {
    const srcDir = path.join(rootDir, 'node_modules', module, dir)
    const destDir = path.join(rootDir, 'views', 'lib', module)
    fse.copySync(srcDir, destDir, { overwrite: true })
    console.log(`Copied files from ${path.relative(rootDir, srcDir)} to ${path.relative(rootDir, destDir)}`)
  }

  try {
    copyModule('leaflet', 'dist') // from node_modules/leaflet/dist -> views/lib/leaflet
    console.log()
    callback()
  } catch (err) {
    console.error(err)
    callback(Error('Error copying front end files'))
  }
}
