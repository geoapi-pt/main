/* unzip ZIP files from INE Censos GeoPackage files (got here https://mapas.ine.pt/download/index2011.phtml)
   and converts them to GeoJSON files and then zip them  */

const fs = require('fs')
const path = require('path')
const async = require('async')
const extract = require('extract-zip')
const colors = require('colors/safe')
const ProgressBar = require('progress')
const gjv = require('geojson-validation')
const appRoot = require('app-root-path')
const { GeoPackageAPI } = require('@ngageoint/geopackage')
const debug = require('debug')('geoapipt:generate-censosdata')

const censosZipDir = path.join(appRoot.path, 'res', 'censos', 'source')
const censosGeoJSONDir = path.join(appRoot.path, 'res', 'censos', 'geojson')

async.series(
  [
    deleteExtractedFiles, // deletes previous extracted ZIP files (just in case ZIP files are updated)
    extractZip, // extracts zip file with shapefile and projection files
    deleteGeojsonFiles, // delete previous GeoJSON files
    convertGeoPackageToGeoJSON,
    validateGeojsonFiles
  ],
  function (err) {
    if (err) {
      console.error(err)
      process.exitCode = 1
    } else {
      console.log('Censos JSON files generated with ' + colors.green.bold('success'))
    }
  })

// deletes previous extracted ZIP files (just in case ZIP files are updated)
function deleteExtractedFiles (mainCallback) {
  console.log('Deleting previous extracted ZIP files to unzip anew')
  // read files recursively from directory
  getFiles(censosZipDir).then(files => {
    const filesToDelete = files.filter(f => path.extname(f) !== '.zip')

    let bar
    if (!debug.enabled) {
      bar = new ProgressBar('[:bar] :percent :info', { total: filesToDelete.length + 2, width: 80 })
    } else {
      bar = { tick: () => {}, terminate: () => {} }
    }

    bar.tick({ info: 'Deleting' })

    async.eachOf(filesToDelete, function (file, key, callback) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file)
          debug(`${path.relative(appRoot.path, file)} deleted`)
          bar.tick({ info: path.relative(appRoot.path, file) })
        } else {
          bar.tick()
        }
        callback()
      } catch (err) {
        callback(Error(err))
      }
    }, function (err) {
      bar.tick({ info: '' })
      bar.terminate()
      if (err) {
        mainCallback(Error(err))
      } else {
        mainCallback()
      }
    })
  })
}

function extractZip (mainCallback) {
  console.log('Unzipping files')

  // read files recursively from directory
  getFiles(censosZipDir).then(files => {
    const filesToExtract = files.filter(f => path.extname(f) === '.zip')

    let bar
    if (!debug.enabled) {
      bar = new ProgressBar('[:bar] :percent :info', { total: filesToExtract.length + 2, width: 80 })
    } else {
      bar = { tick: () => {}, terminate: () => {} }
    }

    bar.tick({ info: 'Extracting' })

    async.eachOf(filesToExtract, function (file, key, callback) {
      extract(file, { dir: path.dirname(file) })
        .then(() => {
          debug(`${path.relative(appRoot.path, file)} extracted`)
          bar.tick({ info: path.relative(appRoot.path, file) })
          callback()
        })
        .catch((errOnUnzip) => {
          callback(Error('Error unziping file ' + file + '. ' + errOnUnzip.message))
        })
    }, function (err) {
      bar.tick({ info: '' })
      bar.terminate()
      if (err) {
        mainCallback(Error(err))
      } else {
        mainCallback()
      }
    })
  })
}

// delete previous GeoJSON files to create new ones
function deleteGeojsonFiles (mainCallback) {
  console.log('Deleting previous geojson files')
  // read files recursively from directory
  getFiles(censosGeoJSONDir).then(files => {
    const filesToDelete = files.filter(f => path.extname(f) === '.json')

    let bar
    if (!debug.enabled) {
      bar = new ProgressBar('[:bar] :percent :info', { total: filesToDelete.length + 2, width: 80 })
    } else {
      bar = { tick: () => {}, terminate: () => {} }
    }

    bar.tick({ info: 'Deleting' })

    async.eachOf(filesToDelete, function (file, key, callback) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file)
          debug(`${path.relative(appRoot.path, file)} deleted`)
          bar.tick({ info: path.relative(appRoot.path, file) })
        } else {
          bar.tick()
        }
        callback()
      } catch (err) {
        callback(Error(err))
      }
    }, function (err) {
      bar.tick({ info: '' })
      bar.terminate()
      if (err) {
        mainCallback(Error(err))
      } else {
        mainCallback()
      }
    })
  })
}

function convertGeoPackageToGeoJSON (mainCallback) {
  console.log('Generating GeoJSON files from GeoPackage files')

  // read files recursively from directory
  getFiles(censosZipDir).then(files => {
    const geoPackageFiles = files.filter(f => path.extname(f) === '.gpkg')

    let bar
    if (!debug.enabled) {
      bar = new ProgressBar('[:bar] :percent :info', { total: geoPackageFiles.length + 2, width: 80 })
    } else {
      bar = { tick: () => {}, terminate: () => {} }
    }

    bar.tick({ info: 'Converting to geoJSON' })

    async.eachOfSeries(geoPackageFiles, function (file, key, callback) {
      GeoPackageAPI.open(file).then(geoPackage => {
        // extract 2011 from ''
        const censosYear = path.basename(path.dirname(file))

        const featureTables = geoPackage.getFeatureTables()

        const geoJson = {
          type: 'FeatureCollection',
          features: []
        }
        const iterator = geoPackage.iterateGeoJSONFeatures(featureTables[0])
        for (const feature of iterator) {
          geoJson.features.push(feature)
        }
        const geoJsonFile = path.join(censosGeoJSONDir, censosYear, featureTables[0] + '.json')
        fs.writeFile(geoJsonFile, JSON.stringify(geoJson),
          (err) => {
            if (err) {
              callback(Error(err))
            } else {
              debug(geoJsonFile + ' converted OK')
              bar.tick({ info: path.relative(appRoot.path, geoJsonFile) })
              callback()
            }
          })
      }).catch(() => {
        bar.tick({ info: '' })
        callback()
      })
    }, function (err) {
      bar.tick({ info: '' })
      bar.terminate()
      if (err) {
        mainCallback(Error(err))
      } else {
        mainCallback()
      }
    })
  })
}

function validateGeojsonFiles (mainCallback) {
  console.log('Validating generated Geojson files')
  // read files recursively from directory
  getFiles(censosGeoJSONDir).then(files => {
    const filesToDelete = files.filter(f => path.extname(f) === '.json')

    let bar
    if (!debug.enabled) {
      bar = new ProgressBar('[:bar] :percent :info', { total: filesToDelete.length + 2, width: 80 })
    } else {
      bar = { tick: () => {}, terminate: () => {} }
    }

    bar.tick({ info: 'Validating' })

    async.eachOf(filesToDelete, function (file, key, callback) {
      try {
        if (fs.existsSync(file)) {
          const data = JSON.parse(fs.readFileSync(file))
          if (!gjv.valid(data)) {
            throw Error(`${file} is invalid GeoJSON`)
          } else {
            debug(`${path.relative(appRoot.path, file)} validated`)
            bar.tick({ info: path.relative(appRoot.path, file) })
          }
        } else {
          bar.tick()
        }
        callback()
      } catch (err) {
        callback(Error(err))
      }
    }, function (err) {
      bar.tick({ info: '' })
      bar.terminate()
      if (err) {
        mainCallback(Error(err))
      } else {
        mainCallback()
      }
    })
  })
}

// read files recursively from directory
async function getFiles (dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name)
    return dirent.isDirectory() ? getFiles(res) : res
  }))
  return files.flat()
}
