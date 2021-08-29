/* several taks performed before the server is initiated
   either to extract zip or read JSON files or to preprocess data for fast delivery */

const fs = require('fs')
const path = require('path')
const shapefile = require('shapefile')
const extract = require('extract-zip')
const async = require('async')
const debug = require('debug')('http')
const colors = require('colors/safe')
const ProgressBar = require('progress')

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

// some files are more recent bu they have less information
// thus information from different sources will be merged
const jsonResFiles = {
  parishesA: 'detalhesFreguesiasA.json',
  parishesB: 'detalhesFreguesiasB.json',
  municipalitiesA: 'detalhesMunicipiosA.json',
  municipalitiesB: 'detalhesMunicipiosB.json'
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
  async.forEachOf(regions, function (value, key, forEachOfCallback) {
    // try calling shapefile.read 5 times, waiting 500 ms between each retry
    // see: https://github.com/mbostock/shapefile/issues/67
    async.retry({ times: 5, interval: 500 }, function (retryCallback) {
      shapefile.read(
        path.join(__dirname, 'res', value.unzippedFilenamesWithoutExtension + '.shp'),
        path.join(__dirname, 'res', value.unzippedFilenamesWithoutExtension + '.dbf'),
        { encoding: 'utf-8' }
      ).then(geojson => {
        console.log(
          `Shapefiles read from ${colors.cyan(value.unzippedFilenamesWithoutExtension + '.shp')} ` +
          `and from ${colors.cyan(value.unzippedFilenamesWithoutExtension + '.dbf')}`
        )
        retryCallback(null, geojson)
      }).catch((err) => {
        retryCallback(Error(err))
      })
    }, function (err, result) {
      if (err) {
        forEachOfCallback(Error(err))
      } else {
        regions[key].geojson = result
        forEachOfCallback()
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
    /********************************************************************************************/
    // municipalities
    administrations.muncicipalitiesDetails = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', jsonResFiles.municipalitiesA), 'utf8')
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
    console.log(colors.cyan(jsonResFiles.municipalitiesA) + ' read with success')

    // still fetches information from municipalities file from DGAL and merges into muncicipalitiesDetails
    const muncicipalitiesDetailsB = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', jsonResFiles.municipalitiesB), 'utf8')
    ).municipios

    for (const municipality of administrations.muncicipalitiesDetails) {
      for (const municipalityB of muncicipalitiesDetailsB) {
        if (cleanStr(municipalityB.MUNICÍPIO) === cleanStr(municipality.nome)) {
          municipality.distrito = municipalityB.Distrito.replace(/Distrito\s/, '')
          municipality.email = municipalityB['E-mail'] || municipality.email
          municipality.telefone = municipalityB['Telefone '] || municipalityB.Telefone || municipality.telefone
          municipality.sitio = municipalityB.Sitio || municipality.sitio
          municipality.presidentecamara = (municipalityB['Nome  Presidente'] || municipality.presidentecamara || '').trim()
          break
        }
      }

      // some names are in the form: "municipality (region)", for ex: "Calheta (Madeira)"
      const matches = /\(([^)]+)\)/.exec(municipality.nome) // extract info between parentheses
      if (matches && matches[1]) {
        municipality['região'] = matches[1]
        municipality.nome = municipality.nome.replace(/ *\([^)]*\) */g, '').trim() // remove text between parentheses
      }
    }
    console.log('Fetched and processed info from ' + colors.cyan(jsonResFiles.municipalitiesB))
  } catch (e) {
    mainCallback(Error(`Error processing municipalities json files: ${e}`))
    return
  }

  // parishes
  try {
    administrations.parishesDetails = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', jsonResFiles.parishesA), 'utf8')
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
    console.log(colors.cyan(jsonResFiles.parishesA) + ' read with success')

    // still fetches information from parishes file from DGAL and merges into parishesDetails
    const parishesDetailsB = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', jsonResFiles.parishesB), 'utf8')
    ).Contatos_freguesias

    const bar = new ProgressBar(`Fetching from ${colors.cyan(jsonResFiles.parishesB)} :percent`, { total: parishesDetailsB.length })

    for (const parishB of parishesDetailsB) {
      bar.tick()
      // removes what is between the last parentheses
      const nameOfParishB = parishB.NOME.replace(/\s*\([^)]*\)\s*$/, '')
      for (const parish of administrations.parishesDetails) {
        if (
          (
            cleanStr(nameOfParishB) === cleanStr(parish.nome) ||
            cleanStr(nameOfParishB) === cleanStr(parish.nomecompleto)
          ) &&
            cleanStr(parishB.MUNICÍPIO) === cleanStr(parish.municipio)
        ) {
          parish.email = parishB.EMAIL || parish.email
          parish.telefone = parishB.TELEFONE || parish.telefone
          break
        }
      }
    }
    console.log('Fetched and processed info from' + colors.cyan(jsonResFiles.parishesB))
  } catch (e) {
    mainCallback(Error(`Error processing parishes json files: ${e}`))
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
        if (!parish || !parish.properties) {
          throw Error(`Object parish (${parish}) or parish.properties (${parish.properties})undefined.\n` +
            JSON.stringify(parishesArray, null, 2))
        }
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

// clean string: lower case, trim whitespaces and remove diacritics
// see also: https://stackoverflow.com/a/37511463/1243247
function cleanStr (str) {
  return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
