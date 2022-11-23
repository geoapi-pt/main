/* generates distrito/municipio/freguesia/secção/subsecção_estatística.json files
   based on OpenAddresses zip CSV file */

const fs = require('fs')
const path = require('path')
const async = require('async')
const ProgressBar = require('progress')
const colors = require('colors/safe')
const proj4 = require('proj4')
const appRoot = require('app-root-path')
const PolygonLookup = require('polygon-lookup')
const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')
const debug = require('debug')('geoapipt:generate-admins-addresses')

const resDirectory = path.join(appRoot.path, 'res', 'admins-addresses')

const censosGeojsonDir = path.join(appRoot.path, 'res', 'censos', 'geojson', '2021')
const fetchAddressesMod = require(path.join(appRoot.path, 'routines', 'commons', 'fetchAddresses.js'))
const getRegionsAndAdminsMod = require(path.join(appRoot.path, 'src', 'server', 'services', 'getRegionsAndAdmins.js'))
const { normalizeName } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'commonFunctions.js'))

let openAddressesData = [] // data fetched from OpenAddresses file

// Fetched from getRegionsAndAdmins module
// see global objects "regions" and "administrations" on getRegionsAndAdmins.js
let regions, administrations

// Main Object with all BGRI2021 codes as keys, each containing all respective addresses
const addressesPerBGRI2021 = {}

const cliOptions = [
  { name: 'download-zip', type: Boolean, description: 'download OpenAddresses zip source file, instead of using local previously downloaded one' },
  { name: 'help', type: Boolean, description: 'print this help' }
]
const cliUsageObj = [
  {
    header: 'generate-admins-addresses',
    content: `Generates divisional administrations JSON files with addresses into ${path.relative(appRoot.path, resDirectory)}`
  },
  {
    header: 'Options',
    optionList: cliOptions
  },
  {
    header: 'Examples',
    content: [
      {
        desc: '1. Fetch OpenAddress zip file and generate all administration JSON files.',
        example: '$ npm run generate-admins-addresses -- --download-zip'
      }
    ]
  }
]
const argvOptions = commandLineArgs(cliOptions)
const cliUsage = commandLineUsage(cliUsageObj)

if (argvOptions.help) {
  console.log(cliUsage)
  process.exit()
}

async.series([
  fetchOpenAddresses,
  getRegionsAndAdmins,
  createMainObject,
  createJsonFiles
], function (err) {
  if (err) {
    console.error(err)
    process.exitCode = 1
  } else {
    console.log(`Addresses JSON files generated with ${colors.green.bold('success')}`)
  }
})

function fetchOpenAddresses (callback) {
  fetchAddressesMod(argvOptions['download-zip'], (err, res) => {
    if (err) {
      callback(Error(err))
    } else {
      openAddressesData = res
      callback()
    }
  })
}

function getRegionsAndAdmins (callback) {
  console.log('Get Regions and Administrations')
  getRegionsAndAdminsMod((err, data) => {
    if (err) {
      callback(Error(err))
    } else {
      regions = data.regions
      debug(regions)
      administrations = data.administrations
      callback()
    }
  })
}

// Create Object `addressesPerBGRI2021` with all addresses corresponding to each BGRI2021 (ex: 01012700139)
// BGRI2021 includes the codes of distrito/município/freguesia/secção/subsecção
function createMainObject (mainCallback) {
  console.log('Bulding main Object with all BGRI2021 codes, each containing all respective addresses')

  // for tests, just get first N entries, i.e., trim array
  // openAddressesData = openAddressesData.slice(0, 500)

  let bar
  if (!debug.enabled) {
    bar = new ProgressBar('[:bar] :percent BGRI2021 :info', { total: openAddressesData.length + 1, width: 80 })
  } else {
    bar = { tick: () => {}, terminate: () => {} }
  }

  bar.tick({ info: '' })

  async.eachLimit(openAddressesData, 100,
    (addr, callback) => {
      try {
        let res
        if (addr.lon && addr.lat) {
          const lon = parseFloat(addr.lon)
          const lat = parseFloat(addr.lat)

          res = getAdminsByCoord(lon, lat)

          if (res && res.BGRI2021) {
            if (!addressesPerBGRI2021[res.BGRI2021]) {
              addressesPerBGRI2021[res.BGRI2021] = {}
              addressesPerBGRI2021[res.BGRI2021].data = res
              addressesPerBGRI2021[res.BGRI2021].addresses = [addr]
            } else {
              addressesPerBGRI2021[res.BGRI2021].addresses.push(addr)
            }
          }
        }
        bar.tick({ info: (res && res.BGRI2021) ? res.BGRI2021 : '' })
        callback()
      } catch (err) {
        console.error(err)
        callback(Error(err))
      }
    },
    (err) => {
      bar.terminate()
      if (err) {
        mainCallback(Error(err))
      } else {
        mainCallback()
      }
    }
  )
}

function createJsonFiles (mainCallback) {
  console.log('Creating JSON files')
  let bar
  if (!debug.enabled) {
    bar = new ProgressBar('[:bar] :percent file :info', { total: Object.keys(addressesPerBGRI2021).length + 1, width: 80 })
  } else {
    bar = { tick: () => {}, terminate: () => {} }
  }

  bar.tick({ info: '' })

  async.eachLimit(addressesPerBGRI2021, 100,
    (BGRI2021data, callback) => {
      try {
        const data = BGRI2021data.data
        const directory = path.join(resDirectory, data.DT, data.CC, data.fr, data.SEC)
        if (!fs.existsSync(directory)) {
          fs.mkdirSync(directory, { recursive: true })
        }
        fs.writeFileSync(
          path.join(directory, data.SS + '.json'),
          JSON.stringify(BGRI2021data, null, 2)
        )
        bar.tick({ info: path.relative(appRoot.path, path.join(directory, data.SS + '.json')) })
        callback()
      } catch (err) {
        callback(Error(err))
      }
    },
    (err) => {
      bar.terminate()
      if (err) {
        mainCallback(Error(err))
      } else {
        mainCallback()
      }
    })
}

function getAdminsByCoord (lon, lat) {
  const local = {}
  const point = [lon, lat] // longitude, latitude
  let municipalityIneCode

  for (const key in regions) {
    const transformedPoint = proj4(regions[key].projection, point)

    const lookupFreguesias = new PolygonLookup(regions[key].geojson)
    const freguesia = lookupFreguesias.search(transformedPoint[0], transformedPoint[1])

    if (freguesia) {
      local.ilha = freguesia.properties.Ilha
      local.distrito = freguesia.properties.Distrito
      local.concelho = freguesia.properties.Concelho
      local.freguesia = freguesia.properties.Freguesia

      // search for details for municipalities by name
      const numberOfMunicipalities = administrations.municipalitiesDetails.length
      const municipality = normalizeName(freguesia.properties.Concelho)
      for (let i = 0; i < numberOfMunicipalities; i++) {
        if (municipality === normalizeName(administrations.municipalitiesDetails[i].nome)) {
          municipalityIneCode = administrations.municipalitiesDetails[i].codigoine
          break // found it, break loop
        }
      }

      break
    }
  }

  if (!local.freguesia || !municipalityIneCode) {
    return null
  }

  // files pattern like BGRI2021_0211.json
  // BGRI => Base Geográfica de Referenciação de Informação (INE, 2021)
  const file = `BGRI2021_${municipalityIneCode.toString().padStart(4, '0')}.json`
  const geojsonFilePath = path.join(censosGeojsonDir, file)
  if (fs.existsSync(geojsonFilePath)) {
    const geojsonData = JSON.parse(fs.readFileSync(geojsonFilePath))
    const lookupBGRI = new PolygonLookup(geojsonData)
    const subSecction = lookupBGRI.search(lon, lat)
    if (subSecction) {
      Object.assign(local, subSecction.properties)
      delete local.N_EDIFICIOS_CLASSICOS
      delete local.N_ALOJAMENTOS
      delete local.N_AGREGADOS
      delete local.N_INDIVIDUOS_RESIDENT
    }
  }

  return local
}
