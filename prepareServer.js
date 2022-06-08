/* several taks performed before the server is initiated
   either to extract zip from Carta Administrativa de Portugal
   or read JSON files from details of Parishes and Municipalities
   and then to preprocess and combine data for fast delivery */

const fs = require('fs')
const path = require('path')
const shapefile = require('shapefile')
const extract = require('extract-zip')
const async = require('async')
const colors = require('colors/safe')
const ProgressBar = require('progress')
const debug = require('debug')('prepareServer') // run: DEBUG=server npm start

module.exports = {
  prepare: function (callback) {
    async.series(
      [
        extractZip,
        readShapefile,
        readProjectionFile,
        readJsonFiles,
        buildAdministrationsObject,
        buildsAdministrationsDistrictsArrays
      ],
      function (err) {
        debug(administrations.municipalitiesDetails)
        debug(administrations.parishesDetails)

        if (err) {
          console.error(err)
          callback(Error(err))
          process.exitCode = 1
        } else {
          console.log('Municipalities and Parishes prepared with ' + colors.green.bold('success'))
          debug(regions)
          debug(administrations)
          callback(null, { regions, administrations })
        }
      })
  },
  normalizeName: normalizeName
}

const regions = {
  cont: {
    name: 'Continente',
    zipFileName: 'Cont_AAD_CAOP2020.zip',
    unzippedFilenamesWithoutExtension: 'Cont_AAD_CAOP2020',
    geojson: {} // to be filled, info extracted from respective files
  },
  ArqMadeira: {
    name: 'Arquipélago da Madeira',
    zipFileName: 'ArqMadeira_AAD_CAOP2020.zip',
    unzippedFilenamesWithoutExtension: 'ArqMadeira_AAd_CAOP2020',
    geojson: {}
  },
  ArqAcores_GOcidental: {
    name: 'Arquipélago dos Açores (Grupo Ocidental)',
    zipFileName: 'ArqAcores_GOcidental_AAd_CAOP2020.zip',
    unzippedFilenamesWithoutExtension: 'ArqAcores_GOcidental_AAd_CAOP2020',
    geojson: {}
  },
  ArqAcores_GCentral: {
    name: 'Arquipélago dos Açores (Grupo Central)',
    zipFileName: 'ArqAcores_GCentral_AAd_CAOP2020.zip',
    unzippedFilenamesWithoutExtension: 'ArqAcores_GCentral_AAd_CAOP2020',
    geojson: {}
  },
  ArqAcores_GOriental: {
    name: 'Arquipélago dos Açores (Grupo Oriental)',
    zipFileName: 'ArqAcores_GOriental_AAd_CAOP2020.zip',
    unzippedFilenamesWithoutExtension: 'ArqAcores_GOriental_AAd_CAOP2020',
    geojson: {}
  }
}

module.exports.regions = regions

// Details of Parishes and Municipalities
// some files are more recent,
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
  keysOfParishesDetails: [], // used to validate request parameters of /freguesia
  municipalitiesDetails: [], // array with details of municípios
  keysOfMunicipalitiesDetails: [], // used to validate request parameters of /municipio
  listOfParishesNames: [], // an array with just names/strings of freguesias
  listOfMunicipalitiesNames: [], // an array with just names/strings of municipios
  listOfMunicipalitiesWithParishes: [], // array of objects, each object corresponding to a municipality and an array of its parishes
  listOfDistricts: [], // array of objects, list de distritos
  listOfDistrictsWithMunicipalities: [] // array of objects, lista de distritos contendo os municípios
}

// extracts zip file with shapefile and projection files
function extractZip (mainCallback) {
  async.forEachOf(regions, function (value, key, callback) {
    const zipFile = path.join(__dirname, 'res', 'portuguese-administrative-chart', value.zipFileName)
    extract(zipFile, { dir: path.join(__dirname, 'res', 'portuguese-administrative-chart') })
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
        path.join(__dirname, 'res', 'portuguese-administrative-chart', value.unzippedFilenamesWithoutExtension + '.shp'),
        path.join(__dirname, 'res', 'portuguese-administrative-chart', value.unzippedFilenamesWithoutExtension + '.dbf'),
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
      path.join(__dirname, 'res', 'portuguese-administrative-chart', value.unzippedFilenamesWithoutExtension + '.prj'),
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
  // municipalities
  try {
    administrations.municipalitiesDetails = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', 'details-parishes-municipalities', jsonResFiles.municipalitiesA), 'utf8')
    ).d
    // just strip out irrelevant info
    for (const municipality of administrations.municipalitiesDetails) {
      delete municipality.PartitionKey
      delete municipality.RowKey
      delete municipality.Timestamp
      delete municipality.entityid
      delete municipality.tipoentidade
      // may change every 4 years and would demand more maintenance to update
      delete municipality.presidentecamara

      // replace property name form entidade to nome
      municipality.nome = municipality.entidade
      delete municipality.entidade
    }
    console.log(colors.cyan(jsonResFiles.municipalitiesA) + ' read with success')

    // still fetches information from municipalities file from DGAL and merges into municipalitiesDetails
    const muncicipalitiesDetailsB = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', 'details-parishes-municipalities', jsonResFiles.municipalitiesB), 'utf8')
    ).municipios

    for (const municipality of administrations.municipalitiesDetails) {
      for (const municipalityB of muncicipalitiesDetailsB) {
        if (normalizeName(municipalityB.MUNICÍPIO) === normalizeName(municipality.nome)) {
          municipality.distrito = municipalityB.Distrito.replace(/Distrito\s/, '')
          municipality.email = municipalityB['E-mail'] || municipality.email
          municipality.telefone = municipalityB['Telefone '] || municipalityB.Telefone || municipality.telefone
          municipality.sitio = municipalityB.Sitio || municipality.sitio
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

    // build administrations.keysOfMunicipalitiesDetails, used to validate request parameters of /municipio
    for (const municipality of administrations.municipalitiesDetails) {
      for (const key in municipality) {
        if (!administrations.keysOfMunicipalitiesDetails.includes(key)) {
          administrations.keysOfMunicipalitiesDetails.push(key)
        }
      }
    }

    console.log('Fetched and processed info from ' + colors.cyan(jsonResFiles.municipalitiesB))
    console.log(`Array of Objects ${colors.cyan('municipalitiesDetails')} created`)
  } catch (e) {
    mainCallback(Error(`Error processing municipalities json files: ${e}`))
    return
  }

  // parishes
  try {
    administrations.parishesDetails = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', 'details-parishes-municipalities', jsonResFiles.parishesA), 'utf8')
    ).d
    // just strip out irrelevant info
    for (const parish of administrations.parishesDetails) {
      delete parish.PartitionKey
      delete parish.RowKey
      delete parish.Timestamp
      delete parish.entityid
      delete parish.tipoentidade

      const tempObj = extractParishInfoFromStr(parish.entidade)
      parish.nome = tempObj.parish
      parish.municipio = tempObj.municipality
      if (tempObj.region) {
        parish['região'] = tempObj.region
      }

      delete parish.entidade
    }
    console.log(colors.cyan(jsonResFiles.parishesA) + ' read with success')

    // still fetches information (email and telephone) from parishes file from DGAL and merges into parishesDetails
    const parishesDetailsB = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', 'details-parishes-municipalities', jsonResFiles.parishesB), 'utf8')
    ).Contatos_freguesias

    const bar = new ProgressBar(
      `Merging from ${colors.cyan(jsonResFiles.parishesB)} into ${colors.cyan(jsonResFiles.parishesA)} to create a ${colors.cyan('parishesDetails')} Array of Objects :percent`,
      { total: parishesDetailsB.length }
    )

    for (const parishB of parishesDetailsB) {
      bar.tick()

      const normalizedNameOfParishB = normalizeName(extractParishInfoFromStr(parishB.NOME).parish)

      for (const parish of administrations.parishesDetails) {
        if (
          (
            normalizedNameOfParishB === normalizeName(parish.nome) ||
            normalizedNameOfParishB === normalizeName(parish.nomecompleto)
          ) &&
            parishB.MUNICÍPIO && parish.municipio &&
            normalizeName(parishB.MUNICÍPIO) === normalizeName(parish.municipio)
        ) {
          parish.email = parishB.EMAIL || parish.email
          parish.telefone = parishB.TELEFONE || parish.telefone
          parish.fax = parishB.FAX || parish.fax
          break
        }
      }
    }

    // build administrations.keysOfParishesDetails, used to validate request parameters of /freguesia
    for (const parish of administrations.parishesDetails) {
      for (const key in parish) {
        if (!administrations.keysOfParishesDetails.includes(key)) {
          administrations.keysOfParishesDetails.push(key)
        }
      }
    }

    console.log('Fetched and processed info from ' + colors.cyan(jsonResFiles.parishesB))
    console.log(`Array of Objects ${colors.cyan('parishesDetails')} created`)
  } catch (e) {
    console.error(e)
    mainCallback(Error(`Error processing parishes json files: ${e}`))
    return
  }

  mainCallback()
}

// builds up global object administrations
function buildAdministrationsObject (callback) {
  for (const key in regions) {
    // now fill in listOfParishesNames, listOfMunicipalitiesNames and listOfMunicipalitiesWithParishes
    const parishesArray = regions[key].geojson.features
    for (const parish of parishesArray) {
      if (!parish || !parish.properties) {
        throw Error(`Object parish (${parish}) or parish.properties (${parish.properties})undefined.\n` +
          JSON.stringify(parishesArray, null, 2))
      }

      // information from geojson
      const municipalityName = parish.properties.Concelho
      const parishName = parish.properties.Freguesia
      const codigoine = parish.properties.Dicofre || parish.properties.DICOFRE

      administrations.listOfParishesNames.push(parishName + ` (${municipalityName})`)
      administrations.listOfMunicipalitiesNames.push(municipalityName)

      // extract parish names from geoson files, because names of parishes do not coincide between sources
      // adding an extra fields nomecompleto2 and nomecompleto3 to administrations.parishesDetails
      for (const parish2 of administrations.parishesDetails) {
        // it detects the parish via Código do INE from different sources
        // Regex to remove leading zeros from string
        if (parish2.codigoine.replace(/^0+/, '') === codigoine.replace(/^0+/, '')) {
          parish2.nomecompleto2 = parishName
          if (parish.properties.Des_Simpli) {
            parish2.nomecompleto3 = parish.properties.Des_Simpli
          }
          break
        }
      }

      // create listOfMunicipalitiesWithParishes
      // ex: [{nome: 'Lisboa', freguesias: ['Santa Maria Maior', ...]}, {nome: 'Porto', freguesias: [...]}, ...]
      if (administrations.listOfMunicipalitiesWithParishes.some((el) => el.nome === municipalityName)) {
        // add parish to already created municipality object
        for (const municipality of administrations.listOfMunicipalitiesWithParishes) {
          if (municipality.nome === municipalityName) {
            municipality.freguesias.push(parishName)
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
  }

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

  callback()
}

function buildsAdministrationsDistrictsArrays (callback) {
  // builds administrations.listOfDistricts
  for (const municipality of administrations.municipalitiesDetails) {
    if (municipality.distrito) {
      administrations.listOfDistricts.push(municipality.distrito)
    }
  }
  administrations.listOfDistricts = [...new Set(administrations.listOfDistricts)]
  administrations.listOfDistricts.sort()

  // builds administrations.listOfDistrictsWithMunicipalities
  administrations.listOfDistrictsWithMunicipalities =
    administrations.listOfDistricts.map(el => ({ distrito: el, municipios: [] }))

  for (const municipality of administrations.municipalitiesDetails) {
    if (municipality.nome && municipality.distrito) {
      administrations.listOfDistrictsWithMunicipalities
        .find(el => el.distrito === municipality.distrito)
        .municipios.push(municipality.nome)
    }
  }

  administrations.listOfDistricts = administrations.listOfDistricts.map(el => correctCase(el))

  for (const district of administrations.listOfDistrictsWithMunicipalities) {
    district.municipios = [...new Set(district.municipios)]
    district.municipios.sort()

    district.distrito = correctCase(district.distrito)
    district.municipios = district.municipios.map(el => correctCase(el))
  }

  callback()
}

/* ****** Auxiliary functions ******** */

// str is a string in the format "Parish (Municipality)" or "Parish (Municipality (Region))"
// extract {Parish, Municipality, Region} from str, test here: https://regex101.com/r/NsM3rf/1
function extractParishInfoFromStr (str) {
  try {
    const extractRegex = /^\s*(.+)\s*\(\s*([^()]+)(\s*|\s*\(.*\)\s*)\)\s*$/
    const matches = str.match(extractRegex)
    const parish = matches[1].trim()
    const municipality = matches[2].trim()
    let region

    if (!parish || !municipality) {
      throw Error(`Extracting parish name and municipality from string '${str}' threw an error`)
    }

    if (matches[3] && matches[3].trim()) {
      const temp = matches[3].trim().match(/^\s*\(\s*(.*)\s*\)\s*$/)
      region = temp[1].trim()
    }

    return { parish: parish, municipality: municipality, region: region }
  } catch (err) {
    throw Error(`Extracting parish name and municipality from string '${str}' threw an error: ${err}`)
  }
}

// normalize name of parish or name of municipality such that it can be compared
function normalizeName (name) {
  if (typeof name === 'string') {
    return name
      .trim() // removes leading and trailing spaces
      .toLowerCase()
      .replace(/\.(\w)/g, '. $1') // add space after a dot followed by letter: 'N.AB' -> 'N. AB'
      .replace(/\s(dos|das|de|da)\s/g, ' ') // remove words 'dos', 'das', 'de' e 'da'
      .replace(/\s+/g, ' ') // removes excess of whitespaces
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // removes diacritics 'á'->'a', 'ç'->'c'
  } else {
    return null
  }
}

// REGUENGOS DE MONSARAZ => Reguengos de Monzaraz
// VENDAS NOVAS => Vendas Novas
// R. A. MADEIRA => R. A. Madeira
function correctCase (_str) {
  let str = _str.toLowerCase()
    .replace(/\s\s+/g, ' ') // remove excess of spaces

  str = str.split(' ').map(word => {
    if (word.length > 2) {
      return word.charAt(0).toUpperCase() + word.slice(1) // capitalize first letter of word
    } else if (word.length === 2 && word.charAt(1) === '.') { // 'r.' => 'R.'
      return word.toUpperCase()
    } else {
      return word
    }
  }).join(' ')

  return str
}
