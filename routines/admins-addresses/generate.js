/* generates distrito/municipio/freguesia/secção/subsecção_estatística.json files
   based on OpenAddresses zip CSV file */

const fs = require('fs')
const path = require('path')
const async = require('async')
const ProgressBar = require('progress')
const colors = require('colors/safe')
const Piscina = require('piscina')
const appRoot = require('app-root-path')
const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')

const resDirectory = path.join(appRoot.path, 'res', 'admins-addresses')

const fetchAddressesMod = require(path.join(appRoot.path, 'routines', 'commons', 'fetchAddresses.js'))
const getRegionsAndAdminsMod = require(path.join(appRoot.path, 'src', 'server', 'services', 'getRegionsAndAdmins.js'))

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
      administrations = data.administrations
      callback()
    }
  })
}

// Create Object `addressesPerBGRI2021` with all addresses corresponding to each BGRI2021 (ex: 01012700139)
// BGRI2021 includes the codes of distrito/município/freguesia/secção/subsecção
function createMainObject (mainCallback) {
  console.log('Bulding main Object with all BGRI2021 codes, each containing all respective addresses')
  console.time('createMainObject')

  // for tests, just get first N entries, i.e., trim array
  // openAddressesData = openAddressesData.slice(0, 5000)

  // for multi-threading processing
  const piscina = new Piscina({
    filename: path.resolve(__dirname, 'createAddressesObject.js')
  })

  const numberThreads = piscina.threads.length
  console.log(`numberThreads: ${numberThreads}\n`)

  console.log('Splitting OpenAddresses data into chunks and processing chunks. This will take many hours...')

  const openAddressesDataChunks = []
  const numberOfChunks = numberThreads * 3
  const bar = new ProgressBar('[:bar] :percent', { total: numberOfChunks * 4, width: 80 })

  // split openAddressesData into chunks
  for (let i = numberOfChunks; i > 0; i--) {
    bar.tick()
    openAddressesDataChunks.push(openAddressesData.splice(0, Math.ceil(openAddressesData.length / i)))
  }

  const addressesPerBGRI2021Chunks = []
  async.eachOfLimit(openAddressesDataChunks, numberThreads,
    async (openAddressesDataChunk, index) => {
      bar.tick()
      const result = await piscina.run({ openAddressesDataChunk, regions, administrations })
      addressesPerBGRI2021Chunks[index] = result
      bar.tick()
    },
    (err) => {
      if (err) {
        mainCallback(Error(err))
      } else {
        // merge results from chunks
        addressesPerBGRI2021Chunks.forEach(chunk => {
          for (const key in chunk) {
            if (!addressesPerBGRI2021.hasOwnProperty(key)) { // eslint-disable-line
              addressesPerBGRI2021[key] = chunk[key]
            } else {
              // just join addresses
              addressesPerBGRI2021[key].addresses = addressesPerBGRI2021[key].addresses.concat(chunk[key].addresses)
            }
          }
          bar.tick()
        })
        bar.terminate()
        console.timeEnd('createMainObject')
        mainCallback()
      }
    })
}

function createJsonFiles (mainCallback) {
  console.log('Creating JSON files')

  const bar = new ProgressBar('[:bar] :percent file :info', { total: Object.keys(addressesPerBGRI2021).length + 1, width: 80 })
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
