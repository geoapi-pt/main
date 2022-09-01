/* Fetch addresses from OpenAddresses and check for each Postal Code the corresponding GPS
   coordinates and calculate a center and polygon for each said Postal Code.
   File from OpenAddresses available on:
   https://github.com/openaddresses/openaddresses/blob/master/sources/pt/countrywide.json */

// see https://github.com/openaddresses/openaddresses/tree/master/sources/pt
const openAddressesPtInfo = 'https://raw.githubusercontent.com/openaddresses/openaddresses/master/sources/pt/countrywide.json'

const fs = require('fs')
const path = require('path')
const download = require('download')
const got = require('got')
const extract = require('extract-zip')
const async = require('async')
const turf = require('@turf/turf')
const ProgressBar = require('progress')
const colors = require('colors/safe')
const csv = require('csvtojson')
const commandLineArgs = require('command-line-args')
const debug = require('debug')('generate-postal-codes')

const preparePostalCodesCTTMod = require(path.join(__dirname, 'preparePostalCodesCTT.js'))

const resDirectory = path.join(__dirname, '..', '..', 'res', 'postal-codes')

let openAddressesDataUrl
let openAddressesZipFilename
let openAddressesZipFilePath
const openAddressesDefaultZipFilePath = path.join(resDirectory, 'pt_addresses.csv.zip')
const unzippedFilesEncoding = 'utf8' // see https://stackoverflow.com/a/14551669/1243247
let unzippedFilePath

let cttData = [] // data fetched from CTT file
let postalCodes = [] // array with CP4-CP3 postal codes (no duplications)
let CP4postalCodes = [] // array with only CP4 postal codes (no duplications)
const openAddressesData = [] // data fetched from OpenAddresses file
let numberOfEntriesOpenAddresses

const functionExecution =
  [
    extractZip, // extracts zip file from OpenAddresses
    countFileLines, // number of lines of CSV file corresponds to the number of entries
    parseCsvFiles, // parse CSV file from OpenAddresses and store it in openAddressesData
    deleteZipFile, // deletes zip file from OpenAddresses
    preparePostalCodesCTT, // parse files from CTT and stores data in cttData
    assembleCP3Data, // process and assemble data from both databases (OpenAddresses and CTT) to generate CP3 JSON files
    assembleCP4Data // process and assemble data from both databases (OpenAddresses and CTT) to generate CP4 JSON files
  ]

// ex: node js/generatePostalCodes.js download-zip
// downloads ZIP from OpenAddresses
const argvOptions = commandLineArgs([
  { name: 'download-zip', type: Boolean }
])

const bDownloadZipFile = argvOptions['download-zip']

if (bDownloadZipFile) {
  // insert these functions at the beginning of function array
  functionExecution.unshift(
    fetchOpenAddressesPtDataUrl, // fetch url to get the PT addresses data
    downloadOpenAddressesPtData // download Open Addresses raw data
  )
} else {
  openAddressesZipFilePath = openAddressesDefaultZipFilePath
}

async.series(
  functionExecution,
  function (err) {
    if (err) {
      console.error(err)
      process.exitCode = 1
    } else {
      console.log(`Postal Codes JSON files generated with ${colors.green.bold('success')}`)
    }
  })

// fetch url to get the PT addresses data
function fetchOpenAddressesPtDataUrl (callback) {
  console.log(`Fetching info from OpenAddresses PT JSON file ${openAddressesPtInfo}`)

  got(openAddressesPtInfo).json()
    .then(body => {
      if (body.error) {
        callback(Error(`\nError ${body.error} fetching info from ${openAddressesPtInfo}`))
      } else if (!body.layers || !body.layers.addresses || !body.layers.addresses[0].data) {
        callback(Error('\nError: key layers.addresses[0].data does not exist in JSON'))
      } else {
        openAddressesDataUrl = body.layers.addresses[0].data
        console.log(`URL with OpenAddresses PT raw data: ${openAddressesDataUrl}`)
        openAddressesZipFilename = openAddressesDataUrl.split('/').pop()
        openAddressesZipFilePath = path.join(resDirectory, openAddressesZipFilename)
        if (openAddressesZipFilename) {
          console.log('File shall be downloaded to ' + openAddressesZipFilePath)
          callback()
        } else {
          callback(Error('Invalid openAddressesZipFilename: ' + openAddressesZipFilename))
        }
      }
    })
    .catch(err => {
      console.error(err.message)
      callback(Error(`\n${err.message} fetching ${openAddressesPtInfo}\n`))
    })
}

// download Open Addresses raw data
function downloadOpenAddressesPtData (callback) {
  console.log(`Downloading OpenAddresses PT raw data from ${openAddressesDataUrl} to ${openAddressesZipFilePath}`)
  console.log('This may take a while, please wait...')

  const writeStream = fs.createWriteStream(openAddressesZipFilePath)
  const readStream = download(openAddressesDataUrl)

  readStream.on('response', function (res) {
    const len = parseInt(res.headers['content-length'], 10)
    const bar = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
      complete: '=',
      incomplete: ' ',
      width: 20,
      total: len
    })

    readStream.on('data', function (chunk) {
      writeStream.write(chunk)
      bar.tick(chunk.length)
    })

    readStream.on('end', function () {
      console.log('Download done with success\n')
      writeStream.end()
      callback()
    })

    readStream.on('error', function (err) {
      console.error('Error:', err)
      process.exit(1)
    })
  })
}

// extracts zip file from OpenAddresses
function extractZip (callback) {
  console.log(`extracting ${openAddressesZipFilePath}`)
  extract(openAddressesZipFilePath, {
    dir: resDirectory,
    onEntry: (entry, zipfile) => {
      unzippedFilePath = path.join(resDirectory, entry.fileName)
    }
  }).then(() => {
    console.log(`extraction complete to ${unzippedFilePath}`)
    callback()
  }).catch((errOnUnzip) => {
    callback(Error('Error unziping file ' + openAddressesZipFilePath + '. ' + errOnUnzip.message))
  })
}

// number of lines of CSV file corresponds to the number of entries
function countFileLines (callback) {
  let lineCount = 0
  fs.createReadStream(unzippedFilePath)
    .on('data', (buffer) => {
      let idx = -1
      lineCount-- // Because the loop will run once for idx=-1
      do {
        idx = buffer.indexOf(10, idx + 1)
        lineCount++
      } while (idx !== -1)
    }).on('end', () => {
      numberOfEntriesOpenAddresses = lineCount
      console.log(`CSV file from OpenAddresses has ${numberOfEntriesOpenAddresses} entries`)
      callback()
    }).on('error', (err) => {
      callback(Error(err))
    })
}

function parseCsvFiles (callback) {
  console.log('Parsing CSV file from OpenAddresses')
  const bar = new ProgressBar('[:bar] :percent', { total: numberOfEntriesOpenAddresses - 1, width: 80 })
  csv({
    delimiter: ','
  })
    .fromStream(fs.createReadStream(unzippedFilePath, { encoding: unzippedFilesEncoding }))
    .subscribe((json) => {
      bar.tick()
      if (Array.isArray(json)) { // json is array
        openAddressesData.push(...json)
      } else { // json is element
        openAddressesData.push(json)
      }
    },
    (err) => {
      bar.terminate()
      callback(Error(err))
    },
    () => {
      bar.terminate()
      console.log('Extracted CSV data from ' + unzippedFilePath)
      callback()
    })
}

function deleteZipFile (callback) {
  if (fs.existsSync(unzippedFilePath)) {
    fs.unlinkSync(unzippedFilePath)
  }
  console.log('Extracted CSF file deleted after being processed')
  callback()
}

function preparePostalCodesCTT (callback) {
  preparePostalCodesCTTMod.prepare((err, data) => {
    if (err) {
      callback(Error(err))
    } else {
      cttData = data
      postalCodes = removeDuplicatesFromArray(cttData.map(el => el.CP))
      console.log(`Found ${postalCodes.length} different CP4-CP3 postal codes in CTT file`)
      CP4postalCodes = removeDuplicatesFromArray(cttData.map(el => el.CP4))
      console.log(`Found ${CP4postalCodes.length} different CP4 postal codes in CTT file`)
      callback()
    }
  })
}

// process and assemble data from both databases (OpenAddresses and CTT) to generate CP3 JSON files
function assembleCP3Data (callback) {
  // for tests, just get first N entries, i.e., trim array
  postalCodes = postalCodes.slice(0, 100)

  // data directory where all CP4/CP3.json will be stored
  if (!fs.existsSync(path.join(resDirectory, 'data'))) {
    fs.mkdirSync(path.join(resDirectory, 'data'))
  }

  console.log(`Creating ${CP4postalCodes.length} directories for postal codes, each directory for each CP4`)
  const barDirectories = new ProgressBar('[:bar] :percent :info', { total: CP4postalCodes.length, width: 80 })
  for (const CP4 of CP4postalCodes) {
    if (!fs.existsSync(path.join(resDirectory, 'data', CP4))) {
      fs.mkdirSync(path.join(resDirectory, 'data', CP4), { recursive: true })
      barDirectories.tick({ info: `${path.join('res', 'postal-codes', 'data', CP4)} created` })
    } else {
      barDirectories.tick({ info: `${path.join('res', 'postal-codes', 'data', CP4)} already exists` })
    }
  }
  barDirectories.terminate()

  console.log('Process and assemble CP4-CP3 Postal Codes data from both databases (OpenAddresses and CTT)')
  const openAddressesDataLen = openAddressesData.length

  let barAssemble
  if (!debug.enabled) {
    barAssemble = new ProgressBar('[:bar] :percent :info', { total: postalCodes.length + 1, width: 80 })
  } else {
    barAssemble = { tick: () => {}, terminate: () => {} }
  }

  barAssemble.tick({ info: 'Beginning' })

  async.each(postalCodes, function (postalCode, callbackAsync) {
    const postalCodeObj = {}
    postalCodeObj.CP = postalCode

    const CP4 = splitCP(postalCode).CP4
    const CP3 = splitCP(postalCode).CP3
    postalCodeObj.CP4 = CP4
    postalCodeObj.CP3 = CP3

    const filename = path.join(resDirectory, 'data', CP4, CP3 + '.json')

    barAssemble.tick({ info: filename })

    // points fetched from OpenAddresses CSV file corresponding to this CP
    const pontos = []

    try {
      // fetch data from CTT file
      let partes = cttData
        .filter(el => el.CP && el.CP === postalCode)
        .map(el => {
          delete el.CP
          delete el.CP4
          delete el.CP3
          return el
        });

      // if these keys are the same for all "partes" move them to root of postalCodeObj
      ['Distrito', 'Concelho', 'Localidade', 'Designação Postal'].forEach(key => {
        const results = removeDuplicatesFromArray(partes.map(el => el[key]))
        if (results.length === 1) {
          postalCodeObj[key] = results[0]
          partes = partes.map(el => { delete el[key]; return el })
        } else {
          postalCodeObj[key] = results
        }
      })

      postalCodeObj.partes = partes

      // merges data from OpenAddresses into the CTT data object
      for (let i = 0; i < openAddressesDataLen; i++) {
        if (postalCode === openAddressesData[i].postcode) {
          pontos.push({
            id: openAddressesData[i].id,
            rua: openAddressesData[i].street,
            casa: openAddressesData[i].house,
            coordenadas: [
              parseFloat(openAddressesData[i].lat),
              parseFloat(openAddressesData[i].lon)
            ]
          })
        }
      }

      postalCodeObj.pontos = pontos

      // get unique arrays of streets
      const streets = pontos.map(local => local.rua).filter(street => street.trim())
      postalCodeObj.ruas = removeDuplicatesFromArray(streets)

      if (
        pontos.every(local =>
          Number.isFinite(local.coordenadas[0]) && Number.isFinite(local.coordenadas[1])
        )
      ) {
        if (pontos.length === 1) {
          // just 1 point, center is that single point
          const centro = pontos[0].coordenadas
          postalCodeObj.centro = postalCodeObj.centroide = postalCodeObj.centroDeMassa = centro
        } else if (pontos.length === 2) {
          // just 2 points, calculates center
          const points = turf.points(pontos.map(local => [local.coordenadas[0], local.coordenadas[1]]))
          const geojsonCenter = turf.center(points)
          const centro = geojsonCenter.geometry.coordinates
          postalCodeObj.centro = postalCodeObj.centroide = postalCodeObj.centroDeMassa = centro
        } else if (pontos.length > 2) {
          // computes center from set of points
          // computes also corresponding convex hull polygon
          // from hull polygon, computes centroid and center of mass
          // https://en.wikipedia.org/wiki/Convex_hull_of_a_simple_polygon
          // https://github.com/jfoclpf/geoapi.pt/issues/27#issuecomment-1222236088
          // https://stackoverflow.com/a/61162868/1243247

          // converts to geojson object
          const points = turf.points(pontos.map(local => [local.coordenadas[0], local.coordenadas[1]]))

          // computes center
          const geojsonCenter = turf.center(points)
          postalCodeObj.centro = geojsonCenter.geometry.coordinates

          // computes convex hull polygon, the minimum polygon than embraces all the points
          const hullPolygon = turf.convex(points)
          if (hullPolygon && hullPolygon.geometry.type === 'Polygon') {
            const geojsonSmoothPolygon = turf.polygonSmooth(hullPolygon, { iterations: 3 })
            try {
              postalCodeObj.poligono = geojsonSmoothPolygon.features[0].geometry.coordinates[0]
            } catch (e) {
              debug('Invalid geojsonSmoothPolygon:', geojsonSmoothPolygon)
            }

            // computes centroide and center of mass from hull polygon
            postalCodeObj.centroide = turf.centroid(hullPolygon).geometry.coordinates
            postalCodeObj.centroDeMassa = turf.center(hullPolygon).geometry.coordinates
          } else {
            postalCodeObj.centroide = postalCodeObj.centroDeMass = postalCodeObj.centro
          }
        }
      }

      debug(filename)
      fs.rmSync(filename, { force: true })
      fs.writeFile(filename, JSON.stringify(postalCodeObj, null, 2), function (err) {
        if (err) {
          console.error('Error creating file ' + filename)
          throw err
        } else {
          callbackAsync()
        }
      })
    } catch (err) {
      console.error(`\nError on ${postalCode}. ${err.message}.`, err)
      console.error('\npontos (from OpenAddresses) for this postalCode: ', pontos)
      callbackAsync(Error(err))
    }
  },
  function (err) {
    barAssemble.terminate()
    if (err) {
      callback(Error(err))
    } else {
      console.log('All CP4-CP3 JSON files have been created successfully')
      callback()
    }
  })
}

// process and assemble data from both databases (OpenAddresses and CTT) to generate CP4 JSON files
function assembleCP4Data (callback) {
  console.log('Process and assemble CP4 Postal Codes data from both databases (OpenAddresses and CTT)')
  const openAddressesDataLen = openAddressesData.length

  let barAssemble
  if (!debug.enabled) {
    barAssemble = new ProgressBar('[:bar] :percent :info', { total: CP4postalCodes.length + 1, width: 80 })
  } else {
    barAssemble = { tick: () => {}, terminate: () => {} }
  }

  barAssemble.tick({ info: 'Beginning' })

  async.each(CP4postalCodes, function (CP4postalCode, callbackAsync) {
    const postalCodeObj = {}
    postalCodeObj.CP4 = CP4postalCode

    const filename = path.join(resDirectory, 'data', CP4postalCode + '.json')

    barAssemble.tick({ info: filename })

    // points fetched from OpenAddresses CSV file corresponding to this CP
    const pontos = []

    try {
      // fetch data from CTT file
      let partes = cttData
        .filter(el => el.CP4 && el.CP4 === CP4postalCode)
        .map(el => {
          delete el.CP
          delete el.CP4
          delete el.CP3
          return el
        });

      // if these keys are the same for all "partes" move them to root of postalCodeObj
      ['Distrito', 'Concelho', 'Localidade', 'Designação Postal'].forEach(key => {
        const results = removeDuplicatesFromArray(partes.map(el => el[key]))
        if (results.length === 1) {
          postalCodeObj[key] = results[0]
          partes = partes.map(el => { delete el[key]; return el })
        } else {
          postalCodeObj[key] = results
        }
      })

      postalCodeObj.partes = partes

      // merges data from OpenAddresses into the CTT data object
      for (let i = 0; i < openAddressesDataLen; i++) {
        if (CP4postalCode === splitCP(openAddressesData[i].postcode).CP4) {
          pontos.push({
            id: openAddressesData[i].id,
            rua: openAddressesData[i].street,
            casa: openAddressesData[i].house,
            coordenadas: [
              parseFloat(openAddressesData[i].lat),
              parseFloat(openAddressesData[i].lon)
            ]
          })
        }
      }

      postalCodeObj.pontos = pontos

      // get unique arrays of streets
      const streets = pontos.map(local => local.rua).filter(street => street.trim())
      postalCodeObj.ruas = removeDuplicatesFromArray(streets)

      if (
        pontos.every(local =>
          Number.isFinite(local.coordenadas[0]) && Number.isFinite(local.coordenadas[1])
        )
      ) {
        if (pontos.length === 1) {
          // just 1 point, center is that single point
          const centro = pontos[0].coordenadas
          postalCodeObj.centro = postalCodeObj.centroide = postalCodeObj.centroDeMassa = centro
        } else if (pontos.length === 2) {
          // just 2 points, calculates center
          const points = turf.points(pontos.map(local => [local.coordenadas[0], local.coordenadas[1]]))
          const geojsonCenter = turf.center(points)
          const centro = geojsonCenter.geometry.coordinates
          postalCodeObj.centro = postalCodeObj.centroide = postalCodeObj.centroDeMassa = centro
        } else if (pontos.length > 2) {
          // computes center from set of points
          // computes also corresponding convex hull polygon
          // from hull polygon, computes centroid and center of mass
          // https://en.wikipedia.org/wiki/Convex_hull_of_a_simple_polygon
          // https://github.com/jfoclpf/geoapi.pt/issues/27#issuecomment-1222236088
          // https://stackoverflow.com/a/61162868/1243247

          // converts to geojson object
          const points = turf.points(pontos.map(local => [local.coordenadas[0], local.coordenadas[1]]))

          // computes center
          const geojsonCenter = turf.center(points)
          postalCodeObj.centro = geojsonCenter.geometry.coordinates

          // computes convex hull polygon, the minimum polygon than embraces all the points
          const hullPolygon = turf.convex(points)
          if (hullPolygon && hullPolygon.geometry.type === 'Polygon') {
            const geojsonSmoothPolygon = turf.polygonSmooth(hullPolygon, { iterations: 3 })
            try {
              postalCodeObj.poligono = geojsonSmoothPolygon.features[0].geometry.coordinates[0]
            } catch (e) {
              debug('Invalid geojsonSmoothPolygon:', geojsonSmoothPolygon)
            }

            // computes centroide and center of mass from hull polygon
            postalCodeObj.centroide = turf.centroid(hullPolygon).geometry.coordinates
            postalCodeObj.centroDeMassa = turf.center(hullPolygon).geometry.coordinates
          } else {
            postalCodeObj.centroide = postalCodeObj.centroDeMass = postalCodeObj.centro
          }
        }
      }

      debug(filename)
      fs.rmSync(filename, { force: true })
      fs.writeFile(filename, JSON.stringify(postalCodeObj, null, 2), function (err) {
        if (err) {
          console.error('Error creating file ' + filename)
          throw err
        } else {
          callbackAsync()
        }
      })
    } catch (err) {
      console.error(`\nError on ${CP4postalCode}. ${err.message}.`, err)
      console.error('\npontos (from OpenAddresses) for this postalCode: ', pontos)
      callbackAsync(Error(err))
    }
  },
  function (err) {
    barAssemble.terminate()
    if (err) {
      callback(Error(err))
    } else {
      console.log('All CP4 JSON files have been created successfully')
      callback()
    }
  })
}

function removeDuplicatesFromArray (array) {
  return [...new Set(array)]
}

function splitCP (str) {
  // any sort of hyphen, dash or minus sign
  const CP = str.split(/\p{Dash}/u)
  return { CP4: CP[0], CP3: CP[1] }
}
