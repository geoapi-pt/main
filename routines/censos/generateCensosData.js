/* unzip ZIP files from INE Censos GeoPackage files (got here https://mapas.ine.pt/download/index2011.phtml)
   and aggregates information by muncicipality and parish in censosDataDir */

const fs = require('fs')
const path = require('path')
const async = require('async')
const JSZip = require('jszip')
const colors = require('colors/safe')
const ProgressBar = require('progress')
const appRoot = require('app-root-path')
const { GeoPackageAPI } = require('@ngageoint/geopackage')
const debug = require('debug')('geoapipt:generate-censosdata')

const getRegionsAndAdmins = require(path.join(
  appRoot.path, 'src', 'server', 'services', 'getRegionsAndAdmins.js'
))

const { correctCase } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'commonFunctions.js'))

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
    getGeoPackageInfo,
    generateDistrictsCensosJsonFiles
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
      fs.readFile(file, function (errOnUnzip, data) {
        if (errOnUnzip) {
          callback(Error('Error reading file ' + file + '. ' + errOnUnzip.message))
        } else {
          JSZip.loadAsync(data).then(function (zip) {
            const promArr = []
            Object.keys(zip.files).forEach(function (filename) {
              const prom = zip.files[filename].async('nodebuffer')
              promArr.push(prom)
              prom.then(function (fileData) {
                const destFilepath = path.join(path.dirname(file), filename)
                fs.writeFileSync(destFilepath, fileData)
              })
            })
            Promise.all(promArr).then((values) => {
              bar.tick({ info: path.relative(appRoot.path, file) })
              debug(path.relative(appRoot.path, file) + ' extracted')
              callback()
            })
          })
        }
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
  console.log('Get information about municipalities and parishes')
  getRegionsAndAdmins((err, data) => {
    if (err) {
      callback(Error(err))
    } else {
      administrations = data.administrations
      callback()
    }
  })
}

function deletePreviousGeneratedData (mainCallback) {
  console.log('Deleting previous generated data: JSON files in ' + path.relative(appRoot.path, censosDataDir))
  // read files recursively from directory
  getFiles(censosDataDir).then(files => {
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

function getGeoPackageInfo (mainCallback) {
  console.log('Fetching information from unzipped GeoPackage files in ' + path.relative(appRoot.path, censosZipDir))
  console.log('and generating new JSON files in ' + path.relative(appRoot.path, censosDataDir))

  // read files recursively from directory
  getFiles(censosZipDir).then(files => {
    const geoPackageFiles = files.filter(f => path.extname(f) === '.gpkg')

    async.eachOfSeries(geoPackageFiles, function (file, key, callback) {
      GeoPackageAPI.open(file).then(geoPackage => {
        console.log(path.relative(appRoot.path, file))
        try {
          generateJsonData(file, geoPackage)
        } catch (err) {
          console.error('\n\nCould not process ' + path.relative(appRoot.path, file))
        }
        callback()
      }).catch(() => {
        callback()
      })
    }, function (err) {
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

  try {
    generateMunicipalityCensosJsonFile(gpkgfilePath, censosYear, codigoIneMunicipality, geoPackage)
    generateParishCensosJsonFiles(gpkgfilePath, censosYear, codigoIneMunicipality, geoPackage)
  } catch (err) {
    console.error('Error on ' + gpkgfilePath, err.message)
  }
}

// For a specific gpkg file corresponding to a year and a municipality, this function generates the JSON censos municipality file
// this function is run once per each different year, for example it is run for censos year 2011 and again for 2021
function generateMunicipalityCensosJsonFile (gpkgfilePath, censosYear, codigoIneMunicipality, geoPackage) {
  const table = geoPackage.getFeatureTables()[0]
  const featureDao = geoPackage.getFeatureDao(table)

  // colums which have statistical numbers to aggregate on the municipality
  const countableColumns = featureDao.columns.filter(c => c.startsWith('N_'))

  // statistical sum for all municipalities
  const sum = {}
  countableColumns.forEach(el => {
    sum[el] = 0
  })

  debug(path.relative(appRoot.path, gpkgfilePath) + ': geoPackage.iterateGeoJSONFeatures')
  const geoPackageIterator = geoPackage.iterateGeoJSONFeatures(table)
  for (const feature of geoPackageIterator) {
    for (const el in sum) {
      sum[el] += feature.properties[el]
    }
  }

  const municipality = administrations.municipalitiesDetails
    .find(e => parseInt(e.codigoine) === codigoIneMunicipality)

  const file = path.join(censosDataDir, 'municipios', codigoIneMunicipality + '.json')

  // if file does not exists creates it; if it exists append stats for the respective year
  if (!fs.existsSync(file)) {
    const data = {
      tipo: 'municipio',
      nome: correctCase(municipality.nome),
      distrito: correctCase(municipality.distrito),
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
function generateParishCensosJsonFiles (gpkgfilePath, censosYear, codigoIneMunicipality, geoPackage) {
  const table = geoPackage.getFeatureTables()[0]
  const featureDao = geoPackage.getFeatureDao(table)

  // colums which have statistical numbers to aggregate on the municipality
  const countableColumns = featureDao.columns.filter(c => c.startsWith('N_'))

  // get INE code for parishes (it differs according to censos year)
  const getParishCode = function (feature) {
    if (censosYear === '2011') {
      return feature.properties.DTMN11 + feature.properties.FR11
    } else if (censosYear === '2021') {
      return feature.properties.DTMNFR21
    } else {
      throw Error('wrong censosYear: ' + censosYear)
    }
  }

  // detect the parishes inside gpkg municipality file
  let parishesCodes = []
  let geoPackageIterator = geoPackage.iterateGeoJSONFeatures(table)
  for (const feature of geoPackageIterator) {
    parishesCodes.push(getParishCode(feature))
  }
  parishesCodes = removeDuplicatesFromArray(parishesCodes)

  parishesCodes = parishesCodes.filter(parishCode =>
    Boolean(administrations.parishesDetails
      .find(e => parseInt(e.codigoine) === parseInt(parishCode)))
  )

  const sums = {} // has all statisitcal data of all parishes of this specific muncipality
  parishesCodes.forEach(parishCode => {
    sums[parishCode] = {}
    countableColumns.forEach(el => {
      sums[parishCode][el] = 0
    })
  })

  geoPackageIterator = geoPackage.iterateGeoJSONFeatures(table)
  for (const feature of geoPackageIterator) {
    const parishCode = getParishCode(feature)
    for (const el in sums[parishCode]) {
      sums[parishCode][el] += feature.properties[el]
    }
  }

  const municipality = administrations.municipalitiesDetails
    .find(e => parseInt(e.codigoine) === codigoIneMunicipality)

  for (const parishCode in sums) {
    const nameOfParish = administrations.parishesDetails
      .find(e => parseInt(e.codigoine) === parseInt(parishCode)).nome

    const file = path.join(censosDataDir, 'freguesias', parishCode + '.json')

    // if file does not exists creates it; if it exists append stats for the respective year
    if (!fs.existsSync(file)) {
      const data = {
        tipo: 'freguesia',
        nome: correctCase(nameOfParish),
        codigoine: parishCode,
        municipio: correctCase(municipality.nome),
        distrito: correctCase(municipality.distrito)
      }
      data['censos' + censosYear] = sums[parishCode]

      fs.writeFileSync(file, JSON.stringify(data, null, 2))
    } else {
      const data = JSON.parse(fs.readFileSync(file))
      fs.unlinkSync(file)
      data['censos' + censosYear] = sums[parishCode]
      fs.writeFileSync(file, JSON.stringify(data, null, 2))
    }
  }
}

// from previously generated municipalities JSON stats files, generates the districts JSON stats files
// by summing all the municipalities stats within a specific district, doing this for all districts
function generateDistrictsCensosJsonFiles (mainCallback) {
  getFiles(path.join(censosDataDir, 'municipios')).then(async (files) => {
    const municipalitiesGeojsonFiles = files.filter(f => path.extname(f) === '.json')

    const municipalities = {}
    await async.each(municipalitiesGeojsonFiles, function (file, callback) {
      const data = JSON.parse(fs.readFileSync(file))
      municipalities[data.codigoine] = data
      callback()
    })

    // process distritos
    const distritosStats = {}
    for (const muncicipalityCode in municipalities) {
      const municipality = municipalities[muncicipalityCode]

      // the first 2 digits of 4 digits municipality code are district code; ex: municipality = 123 => distrito = 01
      const distritoCode = muncicipalityCode.toString().padStart(4, '0').slice(0, 2)
      if (!distritosStats.hasOwnProperty(distritoCode)) { // eslint-disable-line
        distritosStats[distritoCode] = {
          tipo: 'distrito',
          codigoine: Number(distritoCode),
          nome: municipality.distrito,
          censos2011: JSON.parse(JSON.stringify(municipality.censos2011 || {})), // deep clone
          censos2021: JSON.parse(JSON.stringify(municipality.censos2021 || {})) // deep clone
        }
      } else {
        distritosStats[distritoCode].censos2011 =
          mergeAndSumObjs(distritosStats[distritoCode].censos2011, municipality.censos2011)
        distritosStats[distritoCode].censos2021 =
          mergeAndSumObjs(distritosStats[distritoCode].censos2021, municipality.censos2021)
      }
    }

    await async.each(Object.keys(distritosStats), function (distritoCode, callback) {
      const file = path.join(censosDataDir, 'distritos', distritoCode + '.json')
      fs.writeFileSync(file, JSON.stringify(distritosStats[distritoCode], null, 2))
      callback()
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

function removeDuplicatesFromArray (array) {
  return [...new Set(array)]
}

// merge two objects, and in the keys that exist in both, sum them
// ex: o1 = {x: 1, y: 2, z: 3}; o2 = { y: 3, j: 5} => {x: 1, y: 5, z: 3, j: 5}
function mergeAndSumObjs (_o1, _o2) {
  if (!_o1) { return { ..._o2 } }
  if (!_o2) { return { ..._o1 } }
  const o1 = { ..._o1 }
  const o2 = { ..._o2 }
  for (const key of Object.keys({ ...o1, ...o2 })) {
    if (o2[key]) {
      if (o1[key]) {
        o1[key] += o2[key]
      } else {
        o1[key] = o2[key]
      }
    }
  }
  return o1
}
