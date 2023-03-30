/* unzip ZIP files from INE Censos GeoPackage files (got here https://mapas.ine.pt/download/index2011.phtml)
   and converts them to GeoJSON files stored in res/censos/geojson */

const fs = require('fs')
const path = require('path')
const async = require('async')
const turf = require('@turf/turf')
const colors = require('colors/safe')
const ProgressBar = require('progress')
const appRoot = require('app-root-path')
const { GeoPackageAPI } = require('@ngageoint/geopackage')
const debug = require('debug')('geoapipt:generate-geojson')

const commonsDir = path.join(appRoot.path, 'routines', 'commons')
const { extractZip, deleteNonZipFiles } = require(path.join(commonsDir, 'zip.js'))
const { getFiles, deleteAllFilesBasedOnExt, validateAllJsonFilesAsGeojson, createDirIfNotExist } = require(path.join(commonsDir, 'file.js'))

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
    generateSectionsGeojsons,
    validateGeojsonFiles,
    deleteExtractedFiles
  ],
  function (err) {
    if (err) {
      console.error(err)
      process.exitCode = 1
    } else {
      console.log('INE Sections and Subsection GeoJson files generated with ' + colors.green.bold('success'))
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
  console.log('Generating GeoJSON INE Subsections in ' + path.relative(appRoot.path, geoJsonSubseccoesDir))

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
        // each GPKG file corresponds to a municipality of a certain year
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

        createDirIfNotExist(path.dirname(geoJsonFile))
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
      }).catch((err) => {
        bar.tick({ info: '' })
        debug('Error opening ' + file, err.message)
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

// a section comprises a plurality of subsections
// the GeoPackage files just have polygons of subsections, thus we need to merge subsections to create sections
function generateSectionsGeojsons (mainCallback) {
  console.log('Generating GeoJSON INE Sections in ' + path.relative(appRoot.path, geoJsonSeccoesDir))

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
        debug(file)
        // each GPKG file corresponds to a municipality of a certain year
        const censosYear = path.basename(path.dirname(file))

        const featureTables = geoPackage.getFeatureTables()

        // feature collection of subsections
        const geoJson = {
          type: 'FeatureCollection',
          features: []
        }
        const iterator = geoPackage.iterateGeoJSONFeatures(featureTables[0])
        for (const feature of iterator) {
          geoJson.features.push(feature)
        }

        // array of unique section codes for this municipality
        const sectionsCodes = removeDuplicatesArr(
          geoJson.features.map(sec => getSectionCodeFromTableFeature(sec, censosYear))
        )

        const sectionsGeoJsons = {
          type: 'FeatureCollection',
          features: []
        }

        sectionsCodes.forEach(sectionCode => {
          const arr = geoJson.features.filter(sec => sectionCode === getSectionCodeFromTableFeature(sec, censosYear))
          const sectionGeojson = arr.reduce((accumulator, currentValue) => turf.union(accumulator, currentValue), arr[0])
          sectionGeojson.properties = copyFeatureProperties(arr[0], censosYear)

          sectionsGeoJsons.features.push(sectionGeojson)
        })

        const geoJsonFile = path.join(geoJsonSeccoesDir, censosYear, featureTables[0] + '.json')

        createDirIfNotExist(path.dirname(geoJsonFile))
        fs.writeFile(geoJsonFile, JSON.stringify(sectionsGeoJsons),
          (err) => {
            if (err) {
              callback(Error(err))
            } else {
              debug(geoJsonFile + ' converted OK')
              bar.tick({ info: path.relative(appRoot.path, geoJsonFile) })
              callback()
            }
          })
      }).catch((err) => {
        bar.tick({ info: '' })
        debug('Error opening ' + file, err.message)
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

function validateGeojsonFiles (callback) {
  console.log('Validating generated Geojson files')
  validateAllJsonFilesAsGeojson([geoJsonSeccoesDir, geoJsonSubseccoesDir], callback)
}

// get INE code for INE Section (it differs according to censos year)
function getSectionCodeFromTableFeature (feature, censosYear) {
  if (censosYear === '2011') {
    return feature.properties.DTMN11 + feature.properties.FR11 + feature.properties.SEC11
  } else if (censosYear === '2021') {
    return feature.properties.DTMNFRSEC21
  } else {
    throw Error('wrong censosYear: ' + censosYear)
  }
}

// copy from subsection to section only relevant properties
function copyFeatureProperties (feature, censosYear) {
  let properties = {}
  if (censosYear === '2011') {
    properties = {
      DTMN11: feature.properties.DTMN11,
      FR11: feature.properties.FR11,
      SEC11: feature.properties.SEC11,
      NIVEL_DSG: 'Secção'
    }
  } else if (censosYear === '2021') {
    properties = {
      DT21: feature.properties.DT21,
      DTMN21: feature.properties.DTMN21,
      DTMNFR21: feature.properties.DTMNFR21,
      DTMNFRSEC21: feature.properties.DTMNFRSEC21,
      SECNUM21: feature.properties.SECNUM21,
      NIVEL_DSG: 'Secção'
    }
  } else {
    throw Error('wrong censosYear: ' + censosYear)
  }
  return properties
}

function removeDuplicatesArr (arr) {
  return [...new Set(arr)]
}
