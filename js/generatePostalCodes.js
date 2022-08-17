/* Fetch addresses from OpenAddresses and check for each Postal Code the corresponding GPS
   coordinates and calculate a centroid for each said Postal Code.
   File from OpenAddresses available on:
   https://github.com/openaddresses/openaddresses/blob/master/sources/pt/countrywide.json */

const fs = require('fs')
const path = require('path')
const extract = require('extract-zip')
const async = require('async')
const turfCentroid = require('@turf/centroid').default
const ProgressBar = require('progress')
const colors = require('colors/safe')
const csv = require('csvtojson')

const preparePostalCodesCTTMod = require(path.join(__dirname, 'preparePostalCodesCTT.js'))

const resDirectory = path.join(__dirname, '..', 'res', 'postal-codes')
const zipFile = path.join(resDirectory, 'pt_addresses.csv.zip')
const unzippedFilesEncoding = 'utf8' // see https://stackoverflow.com/a/14551669/1243247
let unzippedFilePath

const fileToBeSaved = path.join(__dirname, '..', 'res', 'postal-codes', 'postalCodes.json')

let cttData = []
const openAddressesData = []
let numberOfEntries

async.series(
  [
    extractZip, // extracts zip file from OpenAddresses
    countFileLines, // number of lines of CSV file corresponds to the number of entries
    parseCsvFiles, // parse CSV file from OpenAddresses and store it in openAddressesData
    deleteZipFile, // deletes zip file from OpenAddresses
    preparePostalCodesCTT, // parse files from CTT and stores data in cttData
    assembleData // process and assemble data from both databases, i.e., OpenAddresses and CTT
  ],
  function (err) {
    if (err) {
      console.error(err)
      process.exitCode = 1
    } else {
      console.log(`Postal Codes generated with ${colors.green.bold('success')} on ${fileToBeSaved}`)
    }
  })

// extracts zip file from OpenAddresses
function extractZip (callback) {
  console.log(`extracting ${zipFile}`)
  extract(zipFile, {
    dir: resDirectory,
    onEntry: (entry, zipfile) => {
      unzippedFilePath = path.join(resDirectory, entry.fileName)
    }
  }).then(() => {
    console.log(`extraction complete to ${unzippedFilePath}`)
    callback()
  }).catch((errOnUnzip) => {
    callback(Error('Error unziping file ' + zipFile + '. ' + errOnUnzip.message))
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
  console.log('Process and assemble data from both databases (OpenAddresses and CTT)')

  const cttDataLen = cttData.length
  const openAddressesDataLen = openAddressesData.length
  const bar = new ProgressBar('[:bar] :percent :info', { total: cttDataLen, width: 150 })

  for (let i = 0; i < cttDataLen; i++) {
    const CP = cttData[i].CP
    bar.tick({ info: CP })

    const coordenadas = []
    for (let j = 0; j < openAddressesDataLen; j++) {
      if (CP === openAddressesData[j].postcode) {
        coordenadas.push([
          parseFloat(openAddressesData[j].lat),
          parseFloat(openAddressesData[j].lon)
        ])
      }
    }
    cttData[i].coordenadas = coordenadas

    // calculates centroid for this postal code, based on coordenadas
    if (coordenadas.length) {
      const geojsonCoord = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coordenadas]
        }
      }
      const geojsonCentroid = turfCentroid(geojsonCoord)
      cttData[i].centroide = geojsonCentroid.geometry.coordinates
    }
  }

  bar.terminate()

  fs.writeFileSync(fileToBeSaved, JSON.stringify(cttData))
  callback()
}
