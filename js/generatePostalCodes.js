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
const process = require('process')
const debug = require('debug')('generate-postal-codes')

const preparePostalCodesCTTMod = require(path.join(__dirname, 'preparePostalCodesCTT.js'))

const resDirectory = path.join(__dirname, '..', 'res', 'postal-codes')

let openAddressesDataUrl
let openAddressesZipFilename
let openAddressesZipFilePath
const openAddressesDefaultZipFilePath = path.join(resDirectory, 'pt_addresses.csv.zip')
const unzippedFilesEncoding = 'utf8' // see https://stackoverflow.com/a/14551669/1243247
let unzippedFilePath

let cttData = []
const openAddressesData = []
let numberOfEntries

const functionExecution =
  [
    extractZip, // extracts zip file from OpenAddresses
    countFileLines, // number of lines of CSV file corresponds to the number of entries
    parseCsvFiles, // parse CSV file from OpenAddresses and store it in openAddressesData
    deleteZipFile, // deletes zip file from OpenAddresses
    preparePostalCodesCTT, // parse files from CTT and stores data in cttData
    assembleData // process and assemble data from both databases, i.e., OpenAddresses and CTT
  ]

// ex: node js/generatePostalCodes.js download-zip
// downloads ZIP from OpenAddresses
const bDownloadZipFile = process.argv[2] === 'download-zip'

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
      numberOfEntries = lineCount
      console.log(`CSV file from OpenAddresses has ${numberOfEntries} entries`)
      callback()
    }).on('error', (err) => {
      callback(Error(err))
    })
}

function parseCsvFiles (callback) {
  console.log('Parsing CSV file from OpenAddresses')
  const bar = new ProgressBar('[:bar] :percent', { total: numberOfEntries - 1, width: 80 })
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
      callback()
    }
  })
}

// process and assemble data from both databases, i.e., OpenAddresses and CTT
function assembleData (callback) {
  // for tests, just get first N entries, i.e., trim array
  cttData = cttData.slice(0, 200)

  // data directory where all CP4/CP3.json will be stored
  if (!fs.existsSync(path.join(resDirectory, 'data'))) {
    fs.mkdirSync(path.join(resDirectory, 'data'))
  }

  console.log('Generating Array of Unique CP4 values ')
  // Array of single CP4 values (no duplicates)
  const CP4Arr = [...new Set(cttData.map(el => el.CP4))]

  console.log(`Creating ${CP4Arr.length} directories for postal codes, each directory for each CP4`)
  const barDirectories = new ProgressBar('[:bar] :percent :info', { total: CP4Arr.length, width: 80 })
  for (const CP4 of CP4Arr) {
    if (!fs.existsSync(path.join(resDirectory, 'data', CP4))) {
      fs.mkdirSync(path.join(resDirectory, 'data', CP4), { recursive: true })
      barDirectories.tick({ info: `${path.join('res', 'postal-codes', 'data', CP4)} created` })
    } else {
      barDirectories.tick({ info: `${path.join('res', 'postal-codes', 'data', CP4)} already exists` })
    }
  }
  barDirectories.terminate()

  console.log('Process and assemble Postal Codes data from both databases (OpenAddresses and CTT)')
  const openAddressesDataLen = openAddressesData.length

  let barAssemble
  if (!debug.enabled) {
    barAssemble = new ProgressBar('[:bar] :percent :info', { total: cttData.length + 1, width: 80 })
  } else {
    barAssemble = { tick: () => {}, terminate: () => {} }
  }

  barAssemble.tick({ info: 'Beginning' })

  async.each(cttData, function (cttDataEl, callbackAsync) {
    const filename = path.join(resDirectory, 'data', cttDataEl.CP4, cttDataEl.CP3 + '.json')
    barAssemble.tick({ info: filename })

    let CP
    const locais = [] // locales fetched from OpenAddresses CSV file corresponding to this CP
    try {
      CP = cttDataEl.CP

      // merges data from OpenAddresses into the CTT data object
      for (let j = 0; j < openAddressesDataLen; j++) {
        if (CP === openAddressesData[j].postcode) {
          locais.push({
            id: openAddressesData[j].id,
            rua: openAddressesData[j].street,
            casa: openAddressesData[j].house,
            coordenadas: [
              parseFloat(openAddressesData[j].lat),
              parseFloat(openAddressesData[j].lon)
            ]
          })
        }
      }

      cttDataEl.locais = locais

      // get unique arrays of streets
      const streets = locais.map(local => local.rua)
      cttDataEl.ruas = [...new Set(streets)] // remove duplicate elements of array

      if (
        locais.every(local =>
          Number.isFinite(local.coordenadas[0]) && Number.isFinite(local.coordenadas[1])
        )
      ) {
        if (locais.length === 1) {
          // just 1 point, center is that single point
          const centro = locais[0].coordenadas
          cttDataEl.centro = cttDataEl.centroide = cttDataEl.centroDeMassa = centro
        } else if (locais.length === 2) {
          // just 2 points, calculates center
          const points = turf.points(locais.map(local => [local.coordenadas[0], local.coordenadas[1]]))
          const geojsonCenter = turf.center(points)
          const centro = geojsonCenter.geometry.coordinates
          cttDataEl.centro = cttDataEl.centroide = cttDataEl.centroDeMassa = centro
        } else if (locais.length > 2) {
          // computes center from set of points
          // computes also corresponding convex hull polygon
          // from hull polygon, computes centroid and center of mass
          // https://en.wikipedia.org/wiki/Convex_hull_of_a_simple_polygon
          // https://github.com/jfoclpf/geoapi.pt/issues/27#issuecomment-1222236088
          // https://stackoverflow.com/a/61162868/1243247

          // converts to geojson object
          const points = turf.points(locais.map(local => [local.coordenadas[0], local.coordenadas[1]]))

          // computes center
          const geojsonCenter = turf.center(points)
          cttDataEl.centro = geojsonCenter.geometry.coordinates

          // computes convex hull polygon, the minimum polygon than embraces all the points
          const hullPolygon = turf.convex(points)
          cttDataEl.poligono = turf.polygonSmooth(hullPolygon, { iterations: 3 })

          // computes centroide and center of mass from hull polygon
          cttDataEl.centroide = turf.centroid(hullPolygon).geometry.coordinates
          cttDataEl.centroDeMassa = turf.center(hullPolygon).geometry.coordinates
        }
      }

      debug(filename)
      fs.rmSync(filename, { force: true })
      fs.writeFile(filename, JSON.stringify(cttDataEl, null, 2), function (err) {
        if (err) {
          console.error('Error creating file ' + filename)
          throw err
        } else {
          callbackAsync()
        }
      })
    } catch (err) {
      console.error(`\nError on ${CP}. ${err.message}.`, err)
      console.error('\nlocais for this CP: ', locais)
      callbackAsync(Error(err))
    }
  },
  function (err) {
    barAssemble.terminate()
    if (err) {
      callback(Error(err))
    } else {
      console.log('All JSON files have been created successfully')
      callback()
    }
  })
}
