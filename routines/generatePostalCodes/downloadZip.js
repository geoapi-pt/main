/* Module to download the OpenAddresses ZIP file */

/* First it tries to download the file from a server provided by @joao,
   and if that is not available downloads directly from OpenAddresses server.
   We do that to avoid abusing OpenAddresses free services.
   @joao updates the zip file in his server periodically
   see https://github.com/jfoclpf/geoapi.pt/issues/39#issuecomment-1245582378 */

const fs = require('fs')
const path = require('path')
const ProgressBar = require('progress')
const download = require('download')
const got = require('got')

const resDirectory = path.join(__dirname, '..', '..', '..', 'res', 'postal-codes')
const openAddressesDefaultZipFilePath = path.join(resDirectory, 'pt_addresses.csv.zip')

// provided by @joao server see https://github.com/jfoclpf/geoapi.pt/issues/39#issuecomment-1245582378
const openAddressesZipFileAlternateUrl = 'https://box.wolan.net/geoapi/pt_addresses.csv.zip'

// see https://github.com/openaddresses/openaddresses/tree/master/sources/pt
const openAddressesPtInfo = 'https://raw.githubusercontent.com/openaddresses/openaddresses/master/sources/pt/countrywide.json'

// bDownloadZip comes from argvOptions['download-zip']
module.exports = function (bDownloadZip, callback) {
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
                  callback(null, openAddressesDefaultZipFilePath)
                }
              })
            }
          })
        } else {
          callback(null, openAddressesDefaultZipFilePath)
        }
      })
  } else {
    callback(null, openAddressesDefaultZipFilePath)
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
