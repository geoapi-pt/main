// prepare código postais

const fs = require('fs')
const path = require('path')
const extract = require('extract-zip')
const async = require('async')
const colors = require('colors/safe')
const csv = require('csvtojson')
// const debug = require('debug')('prepareCP') // run: DEBUG=server npm start

const resDirectory = path.join(__dirname, 'res', 'postal-codes')
const zipFile = path.join(__dirname, 'res', 'postal-codes', 'CodigosPostais.zip')
const unzippedFilesEncoding = 'latin1' // see https://stackoverflow.com/a/14551669/1243247

const mainResObj = {
  postalCodes: {
    unzippedFilePath: path.join(__dirname, 'res', 'postal-codes', 'todos_cp.txt'),
    fileHeader: { // for more info see file leiame.txt
      DD: 'Código do Distrito',
      CC: 'Código do Concelho',
      LLLL: 'Código da localidade',
      LOCALIDADE: 'Nome da localidade',
      ART_COD: 'Código da Artéria',
      ART_TIPO: 'Artéria - Tipo (Rua, Praça, etc)',
      PRI_PREP: 'Primeira preposição',
      ART_TITULO: 'Artéria - Titulo (Doutor, Eng.º, Professor, etc)',
      SEG_PREP: 'Segunda preposição',
      ART_DESIG: 'Artéria - Designação',
      ART_LOCAL: 'Artéria - Informação do Local/Zona',
      TROCO: 'Descrição do troço',
      PORTA: 'Número da porta',
      CLIENTE: 'Nome do cliente',
      CP4: 'N.º do código postal',
      CP3: 'Extensão do n.º do código postal',
      CPALF: 'Designação Postal'
    },
    data: [] // data extracted from CSV file
  },
  regions: {
    unzippedFilePath: path.join(__dirname, 'res', 'postal-codes', 'distritos.txt'),
    fileHeader: {
      DD: 'Código do Distrito',
      DESIG: 'Designação do Distrito'
    },
    data: [] // data extracted from CSV file
  },
  municipalities: {
    unzippedFilePath: path.join(__dirname, 'res', 'postal-codes', 'concelhos.txt'),
    fileHeader: {
      DD: 'Código do Distrito',
      CC: 'Código do Concelho',
      DESIG: 'Designação do Concelho'
    },
    data: [] // data extracted from CSV file
  }
}

module.exports = {
  prepare: function (callback) {
    async.series([extractZip, parseCsvFiles],
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

// extracts all zip files to res/postal-codes
function extractZip (callback) {
  extract(zipFile, { dir: resDirectory })
    .then(() => {
      console.log(`zip file extraction for ${zipFile} complete`)
      callback()
    })
    .catch((errOnUnzip) => {
      callback(Error('Error unziping file ' + zipFile + '. ' + errOnUnzip.message))
    })
}

function parseCsvFiles (mainCallback) {
  async.eachOf(mainResObj, (el, key, callback) => {
    csv({
      delimiter: ';',
      noheader: true,
      headers: Object.keys(el.fileHeader)
    })
      .fromStream(fs.createReadStream(el.unzippedFilePath, { encoding: unzippedFilesEncoding }))
      .subscribe((json) => {
        if (Array.isArray(json)) { // json is array
          el.data = el.data.concat(json)
        } else { // json is element
          el.data.push(json)
        }
      },
      (err) => {
        callback(Error(err))
      },
      () => {
        callback()
      })
  },
  (err) => {
    if (err) {
      mainCallback(Error(err))
    } else {
      mainCallback()
    }
  })
}

module.exports.prepare(() => {
  console.log(mainObj.regions.data)
  console.log(mainObj.postalCodes.data)
})
