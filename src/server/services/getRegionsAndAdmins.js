/* Extract zip files from Carta Administrativa de Portugal
   and read JSON files from details of Parishes and Municipalities (from DGAL)
   and then to process and combine data for fast delivery */

const fs = require('fs')
const path = require('path')
const async = require('async')
const colors = require('colors/safe')
const ProgressBar = require('progress')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:getRegionsAndAdmins') // run: DEBUG=geoapipt:getRegionsAndAdmins npm start

const { normalizeName, correctCase } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

const resDir = path.join(appRoot.path, 'res')

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
  keysOfParishesDetails: [], // used to validate request parameters of /freguesias
  municipalitiesDetails: [], // array with details of municípios
  keysOfMunicipalitiesDetails: [], // used to validate request parameters of /municipios
  listOfParishesNames: [], // an array with just names/strings of freguesias
  listOfMunicipalitiesNames: [], // an array with just names/strings of municipios
  listOfMunicipalitiesWithParishes: [], // array of objects, each object corresponding to a municipality and an array of its parishes
  listOfDistricts: [], // array of objects, list de distritos
  listOfDistrictsWithMunicipalities: [] // array of objects, lista de distritos contendo os municípios
}

let regions // Object with geojson data for each parish, divided in 5 main regions

module.exports = function (callback) {
  async.series(
    [
      getGeojsonRegions,
      readJsonFiles, // read JSON files with information (email, phone, etc.) of municipalities and parishes
      buildAdministrationsObject,
      buildsAdministrationsDistrictsArrays,
      addCensusData,
      postProcessAdministrations
    ],
    function (err) {
      if (err) {
        console.error(err)
        callback(Error(err))
        process.exitCode = 1
      } else {
        debug('Municipalities and Parishes prepared with ' + colors.green.bold('success'))
        callback(null, { regions, administrations })
      }
    })
}

function getGeojsonRegions (callback) {
  require(path.join(__dirname, 'getGeojsonRegions.js'))((err, _regions) => {
    if (err) {
      callback(Error(err))
    } else {
      regions = _regions
      callback()
    }
  })
}

// read JSON files with information (email, phone, etc.) of municipalities and parishes
function readJsonFiles (mainCallback) {
  // municipalities
  try {
    administrations.municipalitiesDetails = JSON.parse(fs.readFileSync(
      path.join(resDir, 'details-parishes-municipalities', jsonResFiles.municipalitiesA), 'utf8')
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
      municipality.nome = correctCase(municipality.entidade)
      delete municipality.entidade
    }
    debug(colors.cyan(jsonResFiles.municipalitiesA) + ' read with success')

    // still fetches information from municipalities file from DGAL and merges into municipalitiesDetails
    const muncicipalitiesDetailsB = JSON.parse(fs.readFileSync(
      path.join(resDir, 'details-parishes-municipalities', jsonResFiles.municipalitiesB), 'utf8')
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
    }

    // build administrations.keysOfMunicipalitiesDetails, used to validate request parameters of /municipios
    for (const municipality of administrations.municipalitiesDetails) {
      for (const key in municipality) {
        if (!administrations.keysOfMunicipalitiesDetails.includes(key)) {
          administrations.keysOfMunicipalitiesDetails.push(key)
        }
      }
    }

    // build listOfMunicipalitiesNames
    administrations.listOfMunicipalitiesNames = administrations.municipalitiesDetails.map(m => correctCase(m.nome))
    administrations.listOfMunicipalitiesNames = [...new Set(administrations.listOfMunicipalitiesNames)]
    administrations.listOfMunicipalitiesNames = administrations.listOfMunicipalitiesNames.sort()

    debug('Fetched and processed info from ' + colors.cyan(jsonResFiles.municipalitiesB))
    debug(`Array of Objects ${colors.cyan('municipalitiesDetails')} created`)
  } catch (e) {
    mainCallback(Error(`Error processing municipalities json files: ${e}`))
    return
  }

  // parishes
  try {
    administrations.parishesDetails = JSON.parse(fs.readFileSync(
      path.join(resDir, 'details-parishes-municipalities', jsonResFiles.parishesA), 'utf8')
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
      parish.municipio = correctCase(tempObj.municipality)
      if (tempObj.region) {
        parish['região'] = correctCase(tempObj.region)
      }

      delete parish.entidade
    }
    debug(colors.cyan(jsonResFiles.parishesA) + ' read with success')

    // still fetches information (email and telephone) from parishes file from DGAL and merges into parishesDetails
    const parishesDetailsB = JSON.parse(fs.readFileSync(
      path.join(resDir, 'details-parishes-municipalities', jsonResFiles.parishesB), 'utf8')
    ).Contatos_freguesias

    let bar
    if (debug.enabled) {
      bar = new ProgressBar(
        `Merging from ${colors.cyan(jsonResFiles.parishesB)} into ${colors.cyan(jsonResFiles.parishesA)} to create a ${colors.cyan('parishesDetails')} Array of Objects :percent`,
        { total: parishesDetailsB.length }
      )
    } else {
      bar = new ProgressBar(
        'Preparing 2/2 :percent', { total: parishesDetailsB.length }
      )
    }

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

    // build administrations.keysOfParishesDetails, used to validate request parameters of /freguesias
    for (const parish of administrations.parishesDetails) {
      for (const key in parish) {
        if (!administrations.keysOfParishesDetails.includes(key)) {
          administrations.keysOfParishesDetails.push(key)
        }
      }
    }

    debug('Fetched and processed info from ' + colors.cyan(jsonResFiles.parishesB))
    debug(`Array of Objects ${colors.cyan('parishesDetails')} created`)
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

      // extract parish names from geoson files, because names of parishes do not coincide between sources
      // adding an extra fields nomecompleto2 and nomecompleto3 to administrations.parishesDetails
      for (const parish2 of administrations.parishesDetails) {
        // it detects the parish via Código do INE from different sources
        // Regex to remove leading zeros from string
        if (Number(parish2.codigoine) === Number(codigoine)) {
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
      const district = administrations.listOfDistrictsWithMunicipalities
        .find(el => el.distrito === municipality.distrito)
      district.municipios.push(municipality.nome)

      const districtCodigoine = municipality.codigoine.padStart(4, '0').slice(0, 2)
      if (!district.codigoine) {
        district.codigoine = [districtCodigoine]
      } else if (!district.codigoine.includes(districtCodigoine)) {
        district.codigoine.push(districtCodigoine)
      }
    }
  }

  administrations.listOfDistricts = administrations.listOfDistricts.map(el => correctCase(el))

  for (const district of administrations.listOfDistrictsWithMunicipalities) {
    district.municipios = [...new Set(district.municipios)]
    district.municipios.sort()

    district.distrito = correctCase(district.distrito)
    district.municipios = district.municipios.map(el => correctCase(el))

    if (district.codigoine.length === 1) {
      district.codigoine = district.codigoine[0]
    }
  }

  callback()
}

function addCensusData (callback) {
  const censosParishsesDir = path.join(resDir, 'censos', 'data', 'freguesias')
  administrations.parishesDetails.forEach(el => {
    const file = path.join(censosParishsesDir, String(el.codigoine).padStart(6, '0') + '.json')
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file))
      for (const key in data) {
        if (key.startsWith('censos')) {
          el[key] = data[key]
        }
      }
    }
  })

  const censosMunicipalitiesDir = path.join(appRoot.path, 'res', 'censos', 'data', 'municipios')
  administrations.municipalitiesDetails.forEach(el => {
    const file = path.join(censosMunicipalitiesDir, String(parseInt(el.codigoine)) + '.json')
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file))
      for (const key in data) {
        if (key.startsWith('censos')) {
          el[key] = data[key]
        }
      }
    }
  })

  const censosDistrictsDir = path.join(appRoot.path, 'res', 'censos', 'data', 'distritos')
  administrations.listOfDistrictsWithMunicipalities.forEach(el => {
    const file = path.join(censosDistrictsDir, String(parseInt(el.codigoine)).padStart(2, '0') + '.json')
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file))
      for (const key in data) {
        if (key.startsWith('censos')) {
          el[key] = data[key]
        }
      }
    }
  })

  callback()
}

// apply some tweaks
function postProcessAdministrations (callback) {
  try {
    administrations.parishesDetails.forEach(parish => {
      // tweak porque há 2 "Lagoa"
      if (normalizeName(parish.municipio) === normalizeName('Lagoa') &&
          normalizeName(parish['região']) === normalizeName('Açores')) {
        parish.municipio = 'Lagoa (Açores)'
      }
    })
    callback()
  } catch (err) {
    callback(Error(err))
  }
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
