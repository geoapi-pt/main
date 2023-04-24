/*
  script that runs a http server on localhost and then fetches
  from that server all the parishes and  municipalities possible
*/

const TEST_PORT = 8081

console.log('Validating Parishes and Municipalities')

// const fs = require('fs')
const path = require('path')
const async = require('async')
const colors = require('colors')
const got = require('got')
const HTMLParser = require('node-html-parser')
const ProgressBar = require('progress')
const appRoot = require('app-root-path')

const testServer = require(path.join(__dirname, 'serverForTests'))

let Parishes = [] // Array with ALL the parishes, each element is an object {freguesia, concelho, region}
let regions // Object with geojson files for each region

// main sequence of functions
async.series([
  startsHttpServer,
  getGeojsonRegions,
  buildMetaParishes,
  testAllParishesFromGeojson,
  testAllParishesFromServerRequest,
  testAllMunicipalities,
  testPostalCode,
  testSomeGpsCoordinates,
  testOpenApiPathsJson,
  testOpenApiPathsHtml
],
// done after execution of above funcitons
function (err) {
  testServer.closeServer()
  console.timeEnd('timeToTestServer')

  if (err) {
    console.error(Error(err))
    console.log(colors.red('An error occurred'))
    process.exit(1)
  } else {
    console.log(colors.green('All tests have been tested OK\n'))
    process.exitCode = 0
  }
})

// starts http server on localhost on test default port
function startsHttpServer (callback) {
  console.time('timeToTestServer')
  console.log('Please wait for server to start on...')

  testServer.startsServerForTests(
    ['--port', TEST_PORT],
    function () {
      console.log('server started')
      callback()
    }, function (err) {
      console.error(err)
      callback(Error(err))
    })
}

function getGeojsonRegions (callback) {
  require(
    path.join(appRoot.path, 'src', 'server', 'services', 'getGeojsonRegions')
  )((err, _regions) => {
    if (err) {
      callback(Error(err))
    } else {
      regions = _regions
      callback()
    }
  })
}

/* from object regions and their geojsons, build a single Parishes Array with Objects of the type
   {freguesia, concelho, region} for later simple processing */
function buildMetaParishes (callback) {
  console.log('\nBuilding a meta parishes Object, for requesting each parish to the server, to test the server...')
  try {
    const parishes = []
    for (const key1 in regions) {
      for (const key2 in regions[key1].geojson.features) {
        const geojsonParish = regions[key1].geojson.features[key2]
        parishes.push({
          parish: geojsonParish.properties.Freguesia,
          municipality: geojsonParish.properties.Concelho,
          region: regions[key1].name
        })
        // sometimes an alternative name is available, add it also
        if (geojsonParish.properties.Des_Simpli) {
          parishes.push({
            parish: geojsonParish.properties.Des_Simpli,
            municipality: geojsonParish.properties.Concelho,
            region: regions[key1].name
          })
        }
      }
    }

    // now removes duplicates from Array
    Parishes = parishes.filter(
      (el, index, array) => array.findIndex(
        el2 => (el2.parish === el.parish && el2.municipality === el.municipality && el2.region === el.region)
      ) === index
    )

    // sorts by municipality and joins them together (different parishes from the same municipality)
    Parishes.sort((a, b) => (a.municipality > b.municipality) ? 1 : ((b.municipality > a.municipality) ? -1 : 0))

    console.log('Meta parishes Object created')
    callback()
  } catch (err) {
    console.error(err)
    callback(Error(err))
  }
}

// function to test the server with all parishes located on geoson
function testAllParishesFromGeojson (mainCallback) {
  console.log('Test server with all parishes from geojson file, requesting server with url /freguesias?nome=parish&municipio=municipality')
  const bar = new ProgressBar('[:bar] :percent :info', { total: Parishes.length + 1, width: 80 })
  async.forEachOfLimit(Parishes, 100, function (el, key, callback) {
    testParishWithMunicipality(el.parish, el.municipality, (err, res) => {
      bar.tick({ info: `${el.municipality.padEnd(20)} | ${el.parish.substring(0, 25)}` })
      if (err) {
        console.error(err)
        callback(Error(`Error on ${el.parish}, ${el.municipality} : ${err}`))
      } else {
        callback()
      }
    })
  }, function (err) {
    bar.tick({ info: '' })
    bar.terminate()
    if (err) {
      console.error(err)
      mainCallback(Error(err))
    } else {
      mainCallback()
    }
  })
}

// function to test the server with all parishes obtained from server request /municipios/freguesias
function testAllParishesFromServerRequest (mainCallback) {
  console.log('Test server with all parishes obtained from server request /municipios/freguesias')

  got(`http://localhost:${TEST_PORT}/municipios/freguesias`)
    .json()
    .then(municipalities => {
      // municipalities ex.: [{nome: 'Lisboa', freguesias: ['Santa Maria Maior', ...]}, {nome: 'Porto', freguesias: [...]}, ...]
      const numberOfMunicipalities = municipalities.length
      const parishes = [] // build a parishes object from municipalities
      for (const municipality of municipalities) {
        for (const parish of municipality.freguesias) {
          parishes.push({ municipality: municipality.nome, parish: parish })
        }
      }
      console.log(`Found ${numberOfMunicipalities} municipalities and ${parishes.length} parishes`)

      const bar = new ProgressBar('[:bar] :percent :info', { total: parishes.length + 1, width: 80 })
      async.forEachOfLimit(parishes, 50, function (el, key, callback) {
        testParishWithMunicipality(el.parish, el.municipality, (err, res) => {
          bar.tick({ info: `${el.municipality.padEnd(20)} | ${el.parish.substring(0, 25)}` })
          if (err) {
            callback(Error(`Error on ${el.parish}, ${el.municipality} : ${err}`))
          } else {
            callback()
          }
        })
      }, function (err) {
        bar.tick({ info: '' })
        bar.terminate()
        if (err) {
          console.error(err)
          mainCallback(Error(err))
        } else {
          console.log(colors.green('All parishes and municipalities have been tested OK\n'))
          mainCallback()
        }
      })
    })
    .catch(err => {
      console.error(err)
      mainCallback(Error(`\n${err} on /municipios/freguesias`))
    })
}

// function to test a single parish-municipality combination
function testParishWithMunicipality (parish, municipality, callback) {
  const url = encodeURI(`http://localhost:${TEST_PORT}/freguesias?nome=${parish}&municipio=${municipality}`)
  got(url)
    .json()
    .then(body => {
      if (typeof body !== 'object' || Array.isArray(body)) {
        callback(Error(`\nResult is not an object: ${JSON.stringify(body)},\n on ${url}\n`))
      } else if (body.nome && !body.error && !body.erro) {
        callback(null, body) // success
      } else {
        callback(Error(`\nError ${JSON.stringify(body)},\n on ${url}\n`))
      }
    })
    .catch(err => {
      callback(Error(`\n${JSON.stringify(err)},\n on ${url}\n`))
    })
}

// Ensures that all municipalities have all information
function testAllMunicipalities (mainCallback) {
  console.log('Ensures that all municipalities have all information')

  got(`http://localhost:${TEST_PORT}/municipios`)
    .json()
    .then(municipalities => {
      console.log(`Found ${municipalities.length} municipalities`)

      const bar = new ProgressBar('[:bar] :percent :info', { total: municipalities.length + 1, width: 80 })
      async.eachOfLimit(municipalities, 50, function (municipality, key, callback) {
        const url = `http://localhost:${TEST_PORT}/municipios/${municipality}`
        got(url)
          .json()
          .then(res => {
            bar.tick({ info: res.nome || res[0].nome })
            res = Array.isArray(res) ? res[0] : res
            if (res.nome && res.distrito && res.codigoine) {
              callback()
            } else {
              console.error(res)
              callback(Error(`${municipality} misses nome, distrito or codigoine`))
            }
          })
          .catch(err => {
            console.error(`Error on ${url}`, err)
            callback(Error(`Error on ${url}`))
          })
      }, function (err) {
        bar.tick({ info: '' })
        bar.terminate()
        if (err) {
          console.error(err)
          mainCallback(Error(err))
        } else {
          console.log(colors.green('All municipalities have been tested OK\n'))
          mainCallback()
        }
      })
    })
    .catch(err => {
      console.error(err)
      mainCallback(Error(`\n${err} on /municipios`))
    })
}

function testPostalCode (callback) {
  got(`http://localhost:${TEST_PORT}/cp/1950-449`)
    .json()
    .then(body => {
      if (body.error || body.erro) {
        console.error(body.error || body.erro)
        callback(Error('\nThere was an error in postal code'))
        return
      }

      let body1
      if (Array.isArray(body)) {
        body1 = body[0]
      } else {
        body1 = body
      }

      if (body1.CP === '1950-449') {
        console.log(colors.green('Postal Code tested OK\n'))
        callback()
      } else {
        callback(Error('\nResult does not match postal code'))
      }
    })
    .catch(err => {
      callback(Error(`\n${err} on /cp/1950-449\n`))
    })
}

function testSomeGpsCoordinates (mainCallback) {
  async.each([
    '/gps/40.153687,-8.514602',
    '/gps?lat=40.153687&lon=-8.514602'
  ], function (urlAbsolutePath, eachCallback) {
    const url = encodeURI(`http://localhost:${TEST_PORT}${urlAbsolutePath}`)
    got(url).json()
      .then(body => {
        if (body.error || body.erro) {
          console.error(body.error || body.erro)
          eachCallback(Error('\nThere was an error in gps coordinates'))
        } else if (
          body.freguesia.toLowerCase() === 'anobra' &&
          body.concelho.toLowerCase() === 'condeixa-a-nova' &&
          body.distrito.toLowerCase() === 'coimbra'
        ) {
          eachCallback()
        } else {
          console.error('\nResult does not match gps coordinates')
          eachCallback(Error('\nResult does not match gps coordinates'))
        }
      })
      .catch(err => {
        console.error(`\n${err} on ${url}\n`)
        eachCallback(Error(`\n${err} on ${url}\n`))
      })
  }).then(() => {
    console.log(colors.green('GPS route tested OK\n'))
    mainCallback()
  }).catch(err => {
    console.error(err)
    mainCallback(Error(err))
  })
}

function testOpenApiPathsJson (mainCallback) {
  console.log('Test OpenAPI routes with JSON request')
  async.each(
    require(path.join(__dirname, 'openApiPaths'))(),
    function (urlAbsolutePath, eachCallback) {
      const url = encodeURI(`http://localhost:${TEST_PORT}${urlAbsolutePath}`)
      got(url).json()
        .then(body => {
          console.log(`Testing: ${urlAbsolutePath}`)
          if (body.error || body.erro) {
            console.error(body.error || body.erro)
            eachCallback(Error(`\nError on ${url}`))
          } else {
            const gpsRegex = /^\/gps\/.+/
            const regexMunicipios = /^\/municipios?\/[^/]+$/
            const regexFreguesias = /^\/municipios?\/[^/]+\/freguesias?(\/[^/]+)?$/
            const regexSections = /^\/municipios?\/.+\/sec\/.\d+$/
            const regexSubsections = /^\/municipios?\/.+\/sec\/\d+\/ss\/\d+$/
            const regexDistritos = /^\/distritos?\/.+/
            const postalCodeCP4 = /^\/cp\/\d{4}$/
            const postalCodeCP7 = /^\/cp\/\d{4}\p{Dash}?\d{3}$/u

            if (gpsRegex.test(urlAbsolutePath)) {
              if (
                body.distrito &&
                body.concelho &&
                body.freguesia &&
                (body.uso || urlAbsolutePath.includes('/base'))
              ) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}`))
              }
            } else if (regexMunicipios.test(urlAbsolutePath)) {
              if (urlAbsolutePath.includes('/municipios/freguesias')) {
                if (Array.isArray(body) && body.length) {
                  eachCallback()
                } else {
                  console.error(body)
                  eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}, response is not a non-empty Array`))
                }
              } else { // ex: /municipios/lisboa
                if (body.nome) {
                  eachCallback()
                } else {
                  console.error(body)
                  eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}, it has no key 'nome'`))
                }
              }
            } else if (regexFreguesias.test(urlAbsolutePath)) {
              if (urlAbsolutePath.endsWith('/freguesias')) {
                // ex: /municipio/évora/freguesias
                if (body.nome && Array.isArray(body.freguesias)) {
                  eachCallback()
                } else {
                  console.error(body)
                  eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}, response is not a non-empty Array`))
                }
              } else {
                // ex: /municipio/lisboa/freguesia/ajuda
                if (Array.isArray(body) && body.length && body[0].nome && body[0].municipio && body[0].censos2011) {
                  eachCallback()
                } else if (body.nome && body.municipio && body.censos2011) {
                  eachCallback()
                } else {
                  console.error(body)
                  eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}, it has not these keys: 'nome', 'municipio' and 'censos2011'`))
                }
              }
            } else if (regexSections.test(urlAbsolutePath)) {
              if (body.SEC) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response: ${urlAbsolutePath} has no key SEC`))
              }
            } else if (regexSubsections.test(urlAbsolutePath)) {
              if (body.SS) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response: ${urlAbsolutePath} has no key SS`))
              }
            } else if (regexDistritos.test(urlAbsolutePath)) {
              if (Array.isArray(body) && body.length && body[0].distrito && Array.isArray(body[0].municipios)) {
                eachCallback()
              } else if (body.distrito && Array.isArray(body.municipios)) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response: ${urlAbsolutePath} has not these keys: 'distrito' and 'municipios (Array)'`))
              }
            } else if (postalCodeCP4.test(urlAbsolutePath)) {
              if (body.CP4 &&
                  Array.isArray(body.CP3) &&
                  Array.isArray(body.Localidade) &&
                  Array.isArray(body.partes) &&
                  Array.isArray(body.ruas) &&
                  Array.isArray(body.pontos)
              ) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}`))
              }
            } else if (postalCodeCP7.test(urlAbsolutePath)) {
              if (body.CP4 &&
                  body.CP3 &&
                  Array.isArray(body.partes)
              ) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}`))
              }
            } else {
              eachCallback()
            }
          }
        })
        .catch(err => {
          console.error(err)
          eachCallback(Error(`\nError on ${url}\n`))
        })
    }).then(() => {
    mainCallback()
  }).catch(err => {
    mainCallback(Error(err))
  })
}

function testOpenApiPathsHtml (mainCallback) {
  console.log('\nTest OpenAPI routes with HTML request')
  async.each(
    require(path.join(__dirname, 'openApiPaths'))(),
    function (urlAbsolutePath, eachCallback) {
      const url = encodeURI(`http://localhost:${TEST_PORT}${urlAbsolutePath}`)
      got(url)
        .then(res => {
          const body = res.body
          console.log(`Testing: ${urlAbsolutePath}`)
          const root = HTMLParser.parse(body)

          const gpsRegex = /^\/gps\/.+/
          const regexMunicipios = /^\/municipios?\/.+/
          const regexFreguesias = /.+\/freguesias?\/.+/
          const regexDistritos = /^\/distritos?\/.+/
          const postalCode = /^\/cp\/\d{4}/ // CP4 and CP7

          if (
            gpsRegex.test(urlAbsolutePath) ||
            (regexMunicipios.test(urlAbsolutePath) && !urlAbsolutePath.includes('/municipios/freguesias')) ||
            regexFreguesias.test(urlAbsolutePath) ||
            postalCode.test(urlAbsolutePath)
          ) {
            if (!root.querySelector('#map') || !root.querySelector('.container-table100')) {
              eachCallback(Error(`${urlAbsolutePath} has no #map or no .container-table100`))
            } else {
              eachCallback()
            }
          } else if (regexDistritos.test(urlAbsolutePath)) {
            if (!root.querySelector('.container-table100')) {
              eachCallback(Error(`${urlAbsolutePath} has no .container-table100`))
            } else {
              eachCallback()
            }
          } else {
            eachCallback()
          }
        })
        .catch(err => {
          console.error(err)
          eachCallback(Error(`\nError on ${url}\n`))
        })
    }).then(() => {
    mainCallback()
  }).catch(err => {
    mainCallback(Error(err))
  })
}

function shutdownServer (signal) {
  if (signal) console.log(`\nReceived signal ${signal}`)
  console.log('Closing test server')
  testServer.closeServer()
}

// gracefully exiting upon CTRL-C
process.on('SIGINT', (signal) => shutdownServer(signal))
process.on('SIGTERM', (signal) => shutdownServer(signal))
