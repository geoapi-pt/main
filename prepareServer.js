/* several taks performed before the server is initiated
   either to extract zip or read JSON files or to preprocess data for fast delivery */

const fs = require('fs')
const path = require('path')
const shapefile = require('shapefile')
const extract = require('extract-zip')
const async = require('async')
const debug = require('debug')('http')
const colors = require('colors/safe')

module.exports = function (callback) {
  async.series([extractZip, readShapefile, readProjectionFile, readJsonFiles, buildAdministrationsObject],
    function (err) {
      if (err) {
        console.error(err)
        callback(Error(err))
        process.exitCode = 1
      } else {
        console.log('Server prepared with ' + colors.green.bold('success'))
        debug(regions)
        callback(null, { regions, administrations })
      }
    })
}

const regions = {
  cont: {
    name: 'Continente',
    zipFileName: 'Cont_AAD_CAOP2020.zip',
    unzippedFilenamesWithoutExtension: 'Cont_AAD_CAOP2020'
  },
  ArqMadeira: {
    name: 'Arquipélago da Madeira',
    zipFileName: 'ArqMadeira_AAD_CAOP2020.zip',
    unzippedFilenamesWithoutExtension: 'ArqMadeira_AAd_CAOP2020'
  },
  ArqAcores_GOcidental: {
    name: 'Arquipélago dos Açores (Grupo Ocidental)',
    zipFileName: 'ArqAcores_GOcidental_AAd_CAOP2020.zip',
    unzippedFilenamesWithoutExtension: 'ArqAcores_GOcidental_AAd_CAOP2020'
  },
  ArqAcores_GCentral: {
    name: 'Arquipélago dos Açores (Grupo Central)',
    zipFileName: 'ArqAcores_GCentral_AAd_CAOP2020.zip',
    unzippedFilenamesWithoutExtension: 'ArqAcores_GCentral_AAd_CAOP2020'
  },
  ArqAcores_GOriental: {
    name: 'Arquipélago dos Açores (Grupo Oriental)',
    zipFileName: 'ArqAcores_GOriental_AAd_CAOP2020.zip',
    unzippedFilenamesWithoutExtension: 'ArqAcores_GOriental_AAd_CAOP2020'
  }
}

// for municipalities and parishes
const administrations = {
  parishesDetails: [], // array with details of freguesias
  muncicipalitiesDetails: [], // array with details of municípios
  listOfParishesNames: [], // an array with just names/strings of freguesias
  listOfMunicipalitiesNames: [], // an array with just names/strings of municipios
  listOfMunicipalitiesWithParishes: [] // array of objects, each object corresponding to a municipality and an array of its parishes
}

// extracts zip file with shapefile and projection files
function extractZip (mainCallback) {
  async.forEachOf(regions, function (value, key, callback) {
    const zipFile = path.join(__dirname, 'res', value.zipFileName)
    extract(zipFile, { dir: path.join(__dirname, 'res') })
      .then(() => {
        console.log(`zip file extraction for ${value.name} complete`)
        callback()
      })
      .catch((errOnUnzip) => {
        callback(Error('Error unziping file ' + zipFile + '. ' + errOnUnzip.message))
      })
  }, function (err) {
    if (err) {
      mainCallback(Error(err))
    } else {
      mainCallback()
    }
  })
}

function readShapefile (mainCallback) {
  async.forEachOf(regions, function (value, key, callback) {
    shapefile.read(
      path.join(__dirname, 'res', value.unzippedFilenamesWithoutExtension + '.shp'),
      path.join(__dirname, 'res', value.unzippedFilenamesWithoutExtension + '.dbf'),
      { encoding: 'utf-8' }
    ).then(geojson => {
      regions[key].geojson = geojson
      console.log(
        `Shapefiles read from ${colors.cyan(value.unzippedFilenamesWithoutExtension + '.shp')} ` +
        `and from ${colors.cyan(value.unzippedFilenamesWithoutExtension + '.dbf')}`
      )
      callback()
    }).catch((error) => {
      console.error(error.stack)
      callback(Error('Error reading shapefile'))
    })
  }, function (err) {
    if (err) {
      mainCallback(Error(err))
    } else {
      mainCallback()
    }
  })
}

function readProjectionFile (mainCallback) {
  async.forEachOf(regions, function (value, key, callback) {
    fs.readFile(
      path.join(__dirname, 'res', value.unzippedFilenamesWithoutExtension + '.prj'),
      'utf8',
      (err, data) => {
        if (err) {
          callback(Error(err))
        } else {
          regions[key].projection = data
          console.log(`Projection info read from ${colors.cyan(value.unzippedFilenamesWithoutExtension + '.dbf')}`)
          callback()
        }
      })
  }, function (err) {
    if (err) {
      mainCallback(Error(err))
    } else {
      mainCallback()
    }
  })
}

function readJsonFiles (mainCallback) {
  try {
    administrations.parishesDetails = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', 'detalhesFreguesias.json'), 'utf8')
    ).d
    // just strip out irrelevant info
    for (const parish of administrations.parishesDetails) {
      delete parish.PartitionKey
      delete parish.RowKey
      delete parish.Timestamp
      delete parish.entityid
      delete parish.tipoentidade

      // name is for ex.: "Anobra (CONDEIXA-A-NOVA)"
      // extract municipality from parenthesis
      const regExp = /(.+)\s\(([^)]+)\)/
      parish.nome = regExp.exec(parish.entidade)[1] // nome da freguesia
      parish.municipio = regExp.exec(parish.entidade)[2]
      delete parish.entidade
    }
    console.log(colors.cyan('detalhesFreguesias.json') + ' read with success')

    administrations.muncicipalitiesDetails = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', 'detalhesMunicipios.json'), 'utf8')
    ).d
    // just strip out irrelevant info
    for (const municipality of administrations.muncicipalitiesDetails) {
      delete municipality.PartitionKey
      delete municipality.RowKey
      delete municipality.Timestamp
      delete municipality.entityid
      delete municipality.tipoentidade

      // replace property name form entidade to nome
      municipality.nome = municipality.entidade
      delete municipality.entidade
    }
    console.log(colors.cyan('detalhesMunicipios.json') + ' read with success')
  } catch (e) {
    console.error(e)
    mainCallback(Error(e))
    return
  }

  mainCallback()
}

// builds up global object administrations
function buildAdministrationsObject (mainCallback) {
  async.forEachOf(regions, function (value, key, callback) {
    try {
      // now fill in listOfParishesNames, listOfMunicipalitiesNames and listOfMunicipalitiesWithParishes
      const parishesArray = regions[key].geojson.features
      for (const parish of parishesArray) {
        const municipalityName = parish.properties.Concelho
        const parishName = parish.properties.Freguesia

        administrations.listOfParishesNames.push(parishName + ` (${municipalityName})`)
        administrations.listOfMunicipalitiesNames.push(municipalityName)

        // extract parish names from geoson files, because names of parishes do not coincide between sources
        // adding an extra field nomecompleto2 to administrations.parishesDetails
        for (const parish2 of administrations.parishesDetails) {
          const dicofre = parish.properties.Dicofre || parish.properties.DICOFRE

          // Regex to remove leading zeros from string
          if (parish2.codigoine.replace(/^0+/, '') === dicofre.replace(/^0+/, '')) {
            parish2.nomecompleto2 = parishName
            break
          }
        }

        // create listOfMunicipalitiesWithParishes
        // ex: [{nome: 'Lisboa', freguesias: ['Santa Maria Maior', ...]}, {nome: 'Porto', freguesias: [...]}, ...]
        if (administrations.listOfMunicipalitiesWithParishes.some((el) => el.nome === municipalityName)) {
          // add parish to already created municipality object
          for (const muncipality of administrations.listOfMunicipalitiesWithParishes) {
            if (muncipality.nome === municipalityName) {
              muncipality.freguesias.push(parishName)
            }
          }
        } else {
          // create municipality and add its parish
          const municipalityObj = {
            nome: municipalityName,
            freguesias: [parishName]
          }
          administrations.listOfMunicipalitiesWithParishes.push(municipalityObj)
        }
      }
    } catch (e) {
      callback(Error(e))
      return
    }

    callback()
  }, function (err) {
    if (err) {
      mainCallback(Error(err))
      return
    }

    try {
      // remove duplicates and sorts arrays
      administrations.listOfParishesNames = [...new Set(administrations.listOfParishesNames)]
      administrations.listOfParishesNames = administrations.listOfParishesNames.sort()

      administrations.listOfMunicipalitiesNames = [...new Set(administrations.listOfMunicipalitiesNames)]
      administrations.listOfMunicipalitiesNames = administrations.listOfMunicipalitiesNames.sort()

      // ex: [{nome: 'Lisboa', freguesias: ['Santa Maria Maior', ...]}, {nome: 'Porto', freguesias: [...]}, ...]
      // remove duplicates
      administrations.listOfMunicipalitiesWithParishes = [...new Set(administrations.listOfMunicipalitiesWithParishes)]
      // sort alphabetically by name of municipality
      administrations.listOfMunicipalitiesWithParishes = administrations
        .listOfMunicipalitiesWithParishes.sort((a, b) => {
          const municipalityA = a.nome.toUpperCase()
          const municipalityB = b.nome.toUpperCase()
          return (municipalityA < municipalityB) ? -1 : (municipalityA > municipalityB) ? 1 : 0
        })
      // remove duplicate parishes and sort them for each municipality
      for (const municipality of administrations.listOfMunicipalitiesWithParishes) {
        municipality.freguesias = [...new Set(municipality.freguesias)]
        municipality.freguesias.sort()
      }
    } catch (e) {
      mainCallback(Error(e))
      return
    }

    console.log('administrations Object created with success')
    mainCallback()
  })
}
