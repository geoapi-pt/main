// prepare código postais

// const fs = require('fs')
const path = require('path')
const extract = require('extract-zip')
const async = require('async')
const colors = require('colors/safe')
// const debug = require('debug')('prepareCP') // run: DEBUG=server npm start

const zipFile = path.join(__dirname, 'res', 'CodigosPostais.zip')

module.exports = {
  prepare: function (callback) {
    async.series([extractZip],
      function (err) {
        if (err) {
          console.error(err)
          callback(Error(err))
          process.exitCode = 1
        } else {
          console.log('Postal Codes prepared with ' + colors.green.bold('success'))
          callback()
        }
      })
  }
}

// extracts zip file with shapefile and projection files
function extractZip (callback) {
  extract(zipFile, { dir: path.join(__dirname, 'res') })
    .then(() => {
      console.log(`zip file extraction for ${zipFile} complete`)
      callback()
    })
    .catch((errOnUnzip) => {
      callback(Error('Error unziping file ' + zipFile + '. ' + errOnUnzip.message))
    })
}

module.exports.prepare(() => {})
