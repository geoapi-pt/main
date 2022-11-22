/* Module to download, unzip and process the OpenAddresses ZIP file */

/* First it tries to download the file from a server provided by @joao,
   and if that is not available downloads directly from OpenAddresses server.
   We do that to avoid abusing OpenAddresses free services.
   @joao updates the zip file in his server periodically
   see https://github.com/jfoclpf/geoapi.pt/issues/39#issuecomment-1245582378
   Then unzip and process the file */

const fs = require('fs')
const path = require('path')
const async = require('async')
const csv = require('csvtojson')
const ProgressBar = require('progress')
const download = require('download')
const extract = require('extract-zip')
const colors = require('colors/safe')
const appRoot = require('app-root-path')
const got = require('got')

const resDirectory = path.join(appRoot.path, 'res')
const openAddressesDefaultZipFilePath = path.join(resDirectory, 'pt_addresses.csv.zip')

// provided by @joao server see https://github.com/jfoclpf/geoapi.pt/issues/39#issuecomment-1245582378
const openAddressesZipFileAlternateUrl = 'https://box.wolan.net/geoapi/pt_addresses.csv.zip'

// see https://github.com/openaddresses/openaddresses/tree/master/sources/pt
const openAddressesPtInfo = 'https://raw.githubusercontent.com/openaddresses/openaddresses/master/sources/pt/countrywide.json'

let openAddressesZipFilePath
const unzippedFilesEncoding = 'utf8' // see https://stackoverflow.com/a/14551669/1243247
let unzippedFilePath
let numberOfEntriesOpenAddresses
const openAddressesData = [] // data fetched from OpenAddresses file

let bDownloadZip // boolean to inform if this module shall download zip or use cached (previously downloaded) version

module.exports = (_bDownloadZip, callback) => {
  bDownloadZip = _bDownloadZip

  async.series([
    downloadZip, // downloads zip file from OpenAddresses
    extractZip, // extracts zip file from OpenAddresses
    countFileLines, // number of lines of CSV file corresponds to the number of entries
    parseCsvFiles, // parse CSV file from OpenAddresses and store it in openAddressesData
    deleteZipFile // deletes zip file from OpenAddresses,
  ], function (err) {
    if (err) {
      console.error(err)
      callback(Error(err))
    } else {
      console.log(`OpenAddresses file extracted and processed with ${colors.green.bold('success')}\n\n`)
      callback(null, openAddressesData)
    }
  })
}

function downloadZip (callback) {
  if (bDownloadZip) {
    downloadFile(openAddressesZipFileAlternateUrl, openAddressesDefaultZipFilePath,
      (err) => {
        // when alternate url is not available, go directly to OpenAddresses
        if (err) {
          console.log('file not available, fetching directly from Open Addresses server')
          fetchOpenAddressesPtDataUrl((err2, url) => {
            if (err2) {
              callback(Error(err2))
            } else {
              downloadFile(url, openAddressesDefaultZipFilePath, (err3) => {
                if (err3) {
                  callback(Error(err3))
                } else {
                  openAddressesZipFilePath = openAddressesDefaultZipFilePath
                  callback()
                }
              })
            }
          })
        } else {
          openAddressesZipFilePath = openAddressesDefaultZipFilePath
          callback()
        }
      })
  } else {
    openAddressesZipFilePath = openAddressesDefaultZipFilePath
    callback()
  }
}

// fetch url to get the PT addresses data from OpenAddresses
function fetchOpenAddressesPtDataUrl (callback) {
  console.log(`Fetching info from OpenAddresses PT JSON file ${openAddressesPtInfo}`)

  got(openAddressesPtInfo).json()
    .then(body => {
      if (body.error) {
        callback(Error(`\nError ${body.error} fetching info from ${openAddressesPtInfo}`))
      } else if (!body.layers || !body.layers.addresses || !body.layers.addresses[0].data) {
        callback(Error('\nError: key layers.addresses[0].data does not exist in JSON'))
      } else {
        const openAddressesDataUrl = body.layers.addresses[0].data
        console.log(`URL with OpenAddresses PT raw data: ${openAddressesDataUrl}`)
        if (openAddressesDataUrl) {
          callback(null, openAddressesDataUrl)
        } else {
          callback(Error('Invalid openAddressesDataUrl'))
        }
      }
    })
    .catch(err => {
      console.error(err.message)
      callback(Error(`\n${err.message} fetching ${openAddressesPtInfo}\n`))
    })
}

function downloadFile (originUrl, destPath, callback) {
  console.log(`Downloading file from ${originUrl} to ${destPath}`)
  console.log('This may take a while, please wait...')

  const writeStream = fs.createWriteStream(destPath)
  const readStream = download(originUrl)

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
      callback(Error(err))
    })
  })

  readStream.catch(err => {
    callback(Error(err))
  })
}

// extracts zip file from OpenAddresses
function extractZip (callback) {
  console.log(`Extracting ${path.relative(appRoot.path, openAddressesZipFilePath)}`)
  extract(openAddressesZipFilePath, {
    dir: resDirectory,
    onEntry: (entry, zipfile) => {
      unzippedFilePath = path.join(resDirectory, entry.fileName)
    }
  }).then(() => {
    console.log(`Extraction complete to ${colors.green(path.relative(appRoot.path, unzippedFilePath))}`)
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

  // list of addresses (points in map) to be expurgated from openAddressesData
  const ignoreAddresses = JSON.parse(fs.readFileSync(path.join(__dirname, 'ignoreAddresses.json')))

  const bar = new ProgressBar('[:bar] :percent', { total: numberOfEntriesOpenAddresses - 1, width: 80 })
  csv({
    delimiter: ','
  })
    .fromStream(fs.createReadStream(unzippedFilePath, { encoding: unzippedFilesEncoding }))
    .subscribe((el) => {
      bar.tick()
      if (!((!!el) && (el.constructor === Object))) {
        console.error(el)
        throw Error('element is not an Object')
      } else if (!el.id) {
        console.error(el)
        throw Error('element has no id key')
      } else if (!ignoreAddresses.some(_el => _el.id === el.id)) {
        openAddressesData.push(el)
      }
    },
    (err) => {
      bar.terminate()
      callback(Error(err))
    },
    () => {
      bar.terminate()
      console.log('Extracted CSV data from ' + colors.green(path.relative(appRoot.path, unzippedFilePath)))
      callback()
    })
}

function deleteZipFile (callback) {
  if (fs.existsSync(unzippedFilePath)) {
    fs.unlinkSync(unzippedFilePath)
  }
  console.log('Extracted CSV file deleted after being processed')
  callback()
}
