/* unzip ZIP files from INE Censos GeoPackage files (got here https://mapas.ine.pt/download/index2011.phtml)
   and converts them to GeoJSON files stored in res/censos/geojson */

const fs = require('fs')
const path = require('path')
const async = require('async')
const colors = require('colors/safe')
const ProgressBar = require('progress')
const gjv = require('geojson-validation')
const appRoot = require('app-root-path')
const { GeoPackageAPI } = require('@ngageoint/geopackage')
const debug = require('debug')('geoapipt:generate-censosdata')

const commonsDir = path.join(appRoot.path, 'routines', 'commons')
const { extractZip, deleteNonZipFiles } = require(path.join(commonsDir, 'zip.js'))
const { getFiles, deleteAllFilesBasedOnExt, createDirIfNotExist } = require(path.join(commonsDir, 'file.js'))

const censosZipDir = path.join(appRoot.path, 'res', 'censos', 'source')
const geoJsonSeccoesDir = path.join(appRoot.path, 'res', 'geojson', 'seccoes')
const geoJsonSubseccoesDir = path.join(appRoot.path, 'res', 'geojson', 'subseccoes')

createDirIfNotExist(geoJsonSeccoesDir)
createDirIfNotExist(geoJsonSubseccoesDir)

async.series(
  [
    deleteExtractedFiles, // deletes previous extracted ZIP files (just in case ZIP files are updated)
    extractZipFiles, // extracts zip file with shapefile and projection files
    deleteGeojsonFiles, // delete previous GeoJSON files
    generateSubsectionsGeojsons,
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
function deleteExtractedFiles (callback) {
  deleteNonZipFiles(censosZipDir, callback)
}

function extractZipFiles (callback) {
  extractZip(censosZipDir, callback)
}

// delete previous GeoJSON files to create new ones
function deleteGeojsonFiles (callback) {
  deleteAllFilesBasedOnExt([geoJsonSeccoesDir, geoJsonSubseccoesDir], '.json', callback)
}

function generateSubsectionsGeojsons (mainCallback) {
  console.log('Generating GeoJSON INE subsections')

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
        const geoJsonFile = path.join(geoJsonSubseccoesDir, censosYear, featureTables[0] + '.json')

        if (!fs.existsSync(path.dirname(geoJsonFile))) {
          fs.mkdirSync(path.dirname(geoJsonFile), { recursive: true })
        }

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
  getFiles([geoJsonSeccoesDir, geoJsonSubseccoesDir]).then(files => {
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
