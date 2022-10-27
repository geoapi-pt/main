/* unzip ZIP files from INE Censos GeoPackage files (got here https://mapas.ine.pt/download/index2011.phtml)
   and aggregates information by muncicipality and parish  */

const fs = require('fs')
const path = require('path')
const async = require('async')
const extract = require('extract-zip')
const colors = require('colors/safe')
const ProgressBar = require('progress')
const appRoot = require('app-root-path')
const { GeoPackageAPI } = require('@ngageoint/geopackage')
const debug = require('debug')('geoapipt:generate-censosdata')

const prepareServer = require(path.join(
  appRoot.path, 'src', 'server', 'services', 'prepareServer.js'
))

const censosZipDir = path.join(appRoot.path, 'res', 'censos', 'source')
const censosDataDir = path.join(appRoot.path, 'res', 'censos', 'data')

// object with info about parishes and municipalities
let administrations

async.series(
  [
    deleteExtractedFiles, // deletes previous extracted ZIP files (just in case ZIP files are updated)
    extractZip, // extracts zip file with shapefile and projection files
    getAdministrations,
    deletePreviousGeneratedData,
    getGeoPackageInfo
  ],
  function (err) {
    if (err) {
      console.error(err)
      process.exitCode = 1
    } else {
      console.log(`Censos JSON files generated with ${colors.green.bold('success')} in ${path.relative(appRoot.path, censosDataDir)}`)
    }
  })

function deleteExtractedFiles (mainCallback) {
  console.log('Deleting previous extracted files to unzip anew')
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
  console.log('Unzipping files in ' + path.relative(appRoot.path, censosZipDir))

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

function getAdministrations (callback) {
  console.log('Fetching information about municipalities and parishes')
  prepareServer((err, data) => {
    if (err) {
      callback(Error(err))
    } else {
      administrations = data.administrations
      console.log(administrations.parishesDetails)
      callback()
    }
  })
}

function deletePreviousGeneratedData (mainCallback) {
  console.log('Deleting previous generated data: JSON files in ' + path.relative(appRoot.path, censosDataDir))
  // read files recursively from directory
  getFiles(censosDataDir).then(files => {
    const filesToDelete = files.filter(f => path.extname(f) !== '.json')

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

function getGeoPackageInfo (mainCallback) {
  console.log('Fetching information from unzipped GeoPackage files in ' + path.relative(appRoot.path, censosZipDir))
  console.log('and generating new JSON files in ' + path.relative(appRoot.path, censosDataDir))

  // read files recursively from directory
  getFiles(censosZipDir).then(files => {
    const geoPackageFiles = files.filter(f => path.extname(f) === '.gpkg')

    let bar
    if (!debug.enabled) {
      bar = new ProgressBar('[:bar] :percent :info', { total: geoPackageFiles.length + 2, width: 80 })
    } else {
      bar = { tick: () => {}, terminate: () => {} }
    }

    bar.tick({ info: 'Fetching' })

    async.eachOfSeries(geoPackageFiles, function (file, key, callback) {
      GeoPackageAPI.open(file).then(geoPackage => {
        debug(file)

        bar.tick({ info: path.relative(appRoot.path, file) })
        try {
          generateJsonData(file, geoPackage)
        } catch (err) {
          console.error('\n\nCould not process ' + path.relative(appRoot.path, file))
        }

        callback()
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

// function called for each gpkg file, each file corresponds to a municipality for a specific censos year
// example: file BGRI2011_0206.gpkg refers to municipality whose code is 0206 in Censos 2011
function generateJsonData (gpkgfilePath, geoPackage) {
  // extract 2011 from '/res/censos/source/2011/BGRI2011_0206.gpkg'
  const censosYear = path.basename(path.dirname(gpkgfilePath))

  const table = geoPackage.getFeatureTables()[0]
  const featureDao = geoPackage.getFeatureDao(table)

  // codigo INE of municipality has 4 digits and is embedded in table name,
  // ex: 0206 in 'BGRI2011_0206'
  let codigoIneMunicipality = featureDao.table_name.split('_').pop().trim()
  if (!codigoIneMunicipality || !/^\d{4}$/.test(codigoIneMunicipality)) {
    codigoIneMunicipality = parseInt(featureDao.gpkgTableName.split('_').pop().trim())
  }
  if (!codigoIneMunicipality || !/^\d{4}$/.test(codigoIneMunicipality)) {
    console.error('Cannot extract codigoIneMunicipality: ' + codigoIneMunicipality)
    throw Error('Error on codigoIneMunicipality')
  }
  codigoIneMunicipality = parseInt(codigoIneMunicipality)

  generateMunicipalityCensosJsonFIle(censosYear, codigoIneMunicipality, geoPackage)
  generateParishCensosJsonFIle(censosYear, codigoIneMunicipality, geoPackage)
}

// For a specific gpkg file corresponding to a year and a municipality, this function generates the JSON censos municipality file
// this function is run once per each different year, for example it is run for censos year 2011 and again for 2021
function generateMunicipalityCensosJsonFIle (censosYear, codigoIneMunicipality, geoPackage) {
  const table = geoPackage.getFeatureTables()[0]
  const featureDao = geoPackage.getFeatureDao(table)

  // colums which have statistical numbers to aggregate on the municipality
  const countableColumns = featureDao.columns.filter(c => c.startsWith('N_'))

  // statistical sum for all municipalities
  const sum = {}
  countableColumns.forEach(el => {
    sum[el] = 0
  })

  const geoPackageIterator = geoPackage.iterateGeoJSONFeatures(table)
  for (const feature of geoPackageIterator) {
    for (const el in sum) {
      sum[el] += feature.properties[el]
    }
  }

  const nameOfMunicipality = administrations.municipalitiesDetails
    .find(e => parseInt(e.codigoine) === codigoIneMunicipality).nome

  const file = path.join(censosDataDir, 'municipios', codigoIneMunicipality + '.json')

  // if file does not exists creates it; if it exists append stats for the respective year
  if (!fs.existsSync(file)) {
    const data = {
      tipo: 'municipio',
      nome: nameOfMunicipality,
      codigoine: codigoIneMunicipality
    }
    data['censos' + censosYear] = sum

    fs.writeFileSync(file, JSON.stringify(data, null, 2))
  } else {
    const data = JSON.parse(fs.readFileSync(file))
    fs.unlinkSync(file)
    data['censos' + censosYear] = sum
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
  }
}

// For a specific gpkg file corresponding to a year and a municipality, this function generates the JSON censos parishes file
// this function is run once per each different year, for example it is run for censos year 2011 and again for 2021
function generateParishCensosJsonFIle (censosYear, codigoIneMunicipality, geoPackage) {
  const table = geoPackage.getFeatureTables()[0]
  // const featureDao = geoPackage.getFeatureDao(table)

  // colums which have statistical numbers to aggregate on the municipality
  // const countableColumns = featureDao.columns.filter(c => c.startsWith('N_'))

  // detect the parishes inside gpkg municipality file
  let parishesCodes = []
  if (censosYear === '2011') {
    const geoPackageIterator = geoPackage.iterateGeoJSONFeatures(table)
    for (const feature of geoPackageIterator) {
      parishesCodes.push(feature.properties.DTMN11 + feature.properties.FR11)
    }
  }
  parishesCodes = removeDuplicatesFromArray(parishesCodes)
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

function removeDuplicatesFromArray (array) {
  return [...new Set(array)]
}
