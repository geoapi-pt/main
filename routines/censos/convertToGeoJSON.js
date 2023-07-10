/* unzip ZIP files from INE Censos GeoPackage files (got here https://mapas.ine.pt/download/index2011.phtml)
   and converts them to GeoJSON files stored in res/censos/geojson */

const fs = require('fs')
const path = require('path')
const async = require('async')
const turf = require('@turf/turf')
const colors = require('colors/safe')
const stdout = require('mute-stdout')
const ProgressBar = require('progress')
const appRoot = require('app-root-path')
const exec = require('child_process').execSync
const geojsonhint = require('@mapbox/geojsonhint')
const { GeoPackageAPI } = require('@ngageoint/geopackage')
const debug = require('debug')('geoapipt:generate-geojson')

const commonsDir = path.join(appRoot.path, 'routines', 'commons')
const { extractZip, deleteNonZipFiles } = require(path.join(commonsDir, 'zip.js'))
const { getFiles, deleteAllFilesBasedOnExt, validateAllJsonFilesAsGeojson, createDirIfNotExist } = require(path.join(commonsDir, 'file.js'))

const censosZipDir = path.join(appRoot.path, 'res', 'censos', 'source')
const geoJsonSeccoesDir = path.join(appRoot.path, 'res', 'geojson', 'seccoes')
const geoJsonSubseccoesDir = path.join(appRoot.path, 'res', 'geojson', 'subseccoes')

// check if CLI command ogr2ogr is available
if (exec('ogr2ogr --version').toString().includes('GDAL')) {
  console.log('ogr2ogr is available')
  console.log(exec('ogr2ogr --version').toString())
} else {
  console.log('ogr2ogr not available')
  console.log(exec('ogr2ogr --version').toString())
  process.exit(1)
}

console.log()

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
      console.log(colors.green.bold('INE Sections and Subsection GeoJson files generated with success'))
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
  deleteAllFilesBasedOnExt([geoJsonSeccoesDir, geoJsonSubseccoesDir], '.geojson', callback)
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

    async.eachOfSeries(geoPackageFiles, function (geoPackageFile, key, callback) {
      stdout.mute()
      const GeoPackageAPIPromise = GeoPackageAPI.open(geoPackageFile)
      stdout.unmute()

      GeoPackageAPIPromise.then(geoPackage => {
        // these commands are very verbose
        stdout.mute()

        // each GPKG file corresponds to a municipality of a certain year
        const censosYear = path.basename(path.dirname(geoPackageFile))

        const featureTables = geoPackage.getFeatureTables()

        const geoJson = {
          type: 'FeatureCollection',
          features: []
        }

        const iterator = geoPackage.iterateGeoJSONFeatures(featureTables[0])
        for (const feature of iterator) {
          geoJson.features.push(feature)
        }
        stdout.unmute()

        const DTMNCode = getDTMNCode(geoJson.features[0], censosYear)
        const geoJsonFile = path.join(geoJsonSubseccoesDir, censosYear, DTMNCode + '.geojson')

        try {
          createDirIfNotExist(path.dirname(geoJsonFile))

          const stringifiedGeojson = JSON.stringify(geoJson)

          // lint to check if is valid
          const lintErrors = geojsonhint.hint(stringifiedGeojson)
          if (
            Array.isArray(lintErrors) &&
            lintErrors.length &&
            lintErrors.some(el => el.message.toLowerCase().includes('right-hand rule'))
          ) {
            debug(geoJsonFile + ' does not fulfill Geojson right-hand rule; adapting with ogr2ogr')
            // there's an error related with right-hand rule, correct geojson file with ogr2ogr
            // see https://gis.stackexchange.com/a/312356/182228
            fs.writeFileSync(geoJsonFile + '.tmp', stringifiedGeojson)
            exec(`ogr2ogr -f GeoJSON -lco RFC7946=YES ${geoJsonFile} ${geoJsonFile + '.tmp'}`)

            // check again to be sure is correct
            const lintErrors = geojsonhint.hint(fs.readFileSync(geoJsonFile, 'utf-8'))
            if (
              Array.isArray(lintErrors) &&
              lintErrors.length
            ) {
              console.error(lintErrors)
              console.log(fs.readFileSync(geoJsonFile, 'utf-8'))
              throw Error(`Geojson ${path.relative(appRoot.path, geoJsonFile)} has yet some errors`)
            } else {
              debug(geoJsonFile + ' adapted correctly')
              // everything now OK, delete temp file
              fs.unlinkSync(geoJsonFile + '.tmp')
            }
          } else {
            // nothing to correct, just write geojson file
            fs.writeFileSync(geoJsonFile, stringifiedGeojson)
          }

          debug(geoJsonFile + ' converted OK')
          bar.tick({ info: path.relative(appRoot.path, geoJsonFile) })
          callback()
        } catch (err) {
          callback(Error(err))
        }
      }).catch((err) => {
        console.error(err.message)
        bar.tick({ info: '' })
        debug('Error opening ' + geoPackageFile, err.message)
        callback()
      })
    }, function (err) {
      bar.tick({ info: '' })
      bar.terminate()
      if (err) {
        mainCallback(Error(err.message))
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

    async.eachOfSeries(geoPackageFiles, function (geoPackageFile, key, callback) {
      stdout.mute()
      const GeoPackageAPIPromise = GeoPackageAPI.open(geoPackageFile)
      stdout.unmute()

      GeoPackageAPIPromise.then(geoPackage => {
        // these commands are very verbose
        stdout.mute()

        // each GPKG file corresponds to a municipality of a certain year
        const censosYear = path.basename(path.dirname(geoPackageFile))

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
        stdout.unmute()

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

        const DTMNCode = getDTMNCode(sectionsGeoJsons.features[0], censosYear)
        const geoJsonFile = path.join(geoJsonSeccoesDir, censosYear, DTMNCode + '.geojson')

        try {
          createDirIfNotExist(path.dirname(geoJsonFile))

          const stringifiedGeojson = JSON.stringify(sectionsGeoJsons)

          // lint to check if is valid
          const lintErrors = geojsonhint.hint(stringifiedGeojson)
          if (
            Array.isArray(lintErrors) &&
            lintErrors.length &&
            lintErrors.some(el => el.message.toLowerCase().includes('right-hand rule'))
          ) {
            debug(geoJsonFile + ' does not fulfill Geojson right-hand rule; adapting with ogr2ogr')
            // there's an error related with right-hand rule, correct geojson file with ogr2ogr
            // see https://gis.stackexchange.com/a/312356/182228
            fs.writeFileSync(geoJsonFile + '.tmp', stringifiedGeojson)
            exec(`ogr2ogr -f GeoJSON -lco RFC7946=YES ${geoJsonFile} ${geoJsonFile + '.tmp'}`)

            // check again to be sure is correct
            const lintErrors = geojsonhint.hint(fs.readFileSync(geoJsonFile, 'utf-8'))
            if (
              Array.isArray(lintErrors) &&
              lintErrors.length
            ) {
              console.error(lintErrors)
              console.log(fs.readFileSync(geoJsonFile, 'utf-8'))
              throw Error(`Geojson ${path.relative(appRoot.path, geoJsonFile)} has yet some errors`)
            } else {
              debug(geoJsonFile + ' adapted correctly')
              // everything now OK, delete temp file
              fs.unlinkSync(geoJsonFile + '.tmp')
            }
          } else {
            // nothing to correct, just write geojson file
            debug(geoJsonFile + ': nothing to correct, just write file')
            fs.writeFileSync(geoJsonFile, stringifiedGeojson)
          }

          debug(geoJsonFile + ' converted OK')
          bar.tick({ info: path.relative(appRoot.path, geoJsonFile) })
          callback()
        } catch (err) {
          callback(Error(err))
        }
      }).catch((err) => {
        bar.tick({ info: '' })
        debug('Error opening ' + geoPackageFile, err.message)
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

function getDTMNCode (feature, censosYear) {
  const p = feature.properties
  if (censosYear === '2011') {
    return p.DTMN11
  } else if (censosYear === '2021') {
    return p.DTMN21
  } else {
    throw Error('wrong censosYear: ' + censosYear)
  }
}

function removeDuplicatesArr (arr) {
  return [...new Set(arr)]
}
