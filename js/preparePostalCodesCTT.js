// prepare código postais

const fs = require('fs')
const path = require('path')
const extract = require('extract-zip')
const async = require('async')
const colors = require('colors/safe')
const csv = require('csvtojson')

const resDirectory = path.join(__dirname, '..', 'res', 'postal-codes')
const zipFile = path.join(resDirectory, 'CodigosPostais.zip')
const unzippedFilesEncoding = 'latin1' // see https://stackoverflow.com/a/14551669/1243247

let mainData = [] // to be exported from the current module

const mainResObj = {
  postalCodes: {
    unzippedFilePath: path.join(resDirectory, 'todos_cp.txt'),
    fileHeader: { // for more info see file leiame.txt
      DD: 'Código do Distrito',
      CC: 'Código do Concelho',
      LLLL: 'Código da localidade',
      LOCALIDADE: 'Nome da localidade',
      ART_COD: 'Código da Artéria',
      ART_TIPO: 'Tipo de Artéria',
      PRI_PREP: 'Primeira preposição',
      ART_TITULO: 'Titulo da Artéria',
      SEG_PREP: 'Segunda preposição',
      ART_DESIG: 'Designação da Artéria',
      ART_LOCAL: 'Informação do Local/Zona da Artéria',
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
    unzippedFilePath: path.join(resDirectory, 'distritos.txt'),
    fileHeader: {
      DD: 'Código do Distrito',
      DESIG: 'Designação do Distrito'
    },
    data: [] // data extracted from CSV file
  },
  municipalities: {
    unzippedFilePath: path.join(resDirectory, 'concelhos.txt'),
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
    async.series([extractZip, parseCsvFiles, assembleMainData],
      function (err) {
        if (err) {
          console.error(err)
          callback(Error(err))
          process.exitCode = 1
        } else {
          console.log('Postal Codes prepared with ' + colors.green.bold('success'))
          callback(null, mainData)
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
          el.data.push(...json)
        } else { // json is element
          el.data.push(json)
        }
      },
      (err) => {
        callback(Error(err))
      },
      () => {
        console.log('Extracted CSV data from ' + el.unzippedFilePath)
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

function assembleMainData (callback) {
  try {
    mainData = [...mainResObj.postalCodes.data] // clone array
    for (const obj of mainData) {
      obj.Distrito = mainResObj.regions.data.find(el => el.DD === obj.DD).DESIG
      obj.Concelho = mainResObj.municipalities.data.find(el => el.DD === obj.DD && el.CC === obj.CC).DESIG
      delete obj.DD
      delete obj.CC
      delete obj.LLLL

      obj.CP = obj.CP4 + '-' + obj.CP3

      obj.Artéria = obj.ART_TIPO + ' ' +
                    obj.PRI_PREP + ' ' +
                    obj.ART_TITULO + ' ' +
                    obj.SEG_PREP + ' ' +
                    obj.ART_DESIG
      obj.Artéria = obj.Artéria.replace(/\s\s+/g, ' ') // remove excess spaces

      delete obj.ART_TIPO
      delete obj.PRI_PREP
      delete obj.ART_TITULO
      delete obj.SEG_PREP
      delete obj.ART_DESIG

      obj.Localidade = obj.LOCALIDADE
      obj.Local = obj.ART_LOCAL
      obj.Troço = obj.TROCO
      obj.Porta = obj.PORTA
      obj.Cliente = obj.CLIENTE
      obj['Designação Postal'] = obj.CPALF

      delete obj.LOCALIDADE
      delete obj.ART_COD
      delete obj.ART_LOCAL
      delete obj.TROCO
      delete obj.PORTA
      delete obj.CLIENTE
      delete obj.CPALF
    }

    callback()
  } catch (err) {
    callback(Error(err))
  }
}
