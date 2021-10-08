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
const shapefile = require('shapefile')
const ProgressBar = require('progress')

const testServer = require(path.join(__dirname, 'serverForTests'))
const { regions } = require(path.join(__dirname, '..', 'prepareServer'))
let Parishes = [] // Array with ALL the parishes, each element is an object {freguesia, concelho, region}

async.series([startsHttpServer, readShapefile, buildMetaParishes, testAllParishes],
  // done after execution of above funcitons
  function (err, results) {
    testServer.closeServer()
    console.timeEnd('timeToTestServer')

    if (err) {
      console.error(Error(err))
      console.log(colors.red('An error occurred'))
      process.exitCode = 1
    } else {
      console.log(colors.green('All parishes and municipalities have been tested OK\n'))
      process.exitCode = 0
    }
  }
)

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
      callback(Error(err))
    })
}

function readShapefile (mainCallback) {
  async.forEachOf(regions, function (value, key, forEachOfCallback) {
    // try calling shapefile.read 5 times, waiting 500 ms between each retry
    // see: https://github.com/mbostock/shapefile/issues/67
    async.retry({ times: 5, interval: 500 }, function (retryCallback) {
      shapefile.read(
        path.join(__dirname, '..', 'res', value.unzippedFilenamesWithoutExtension + '.shp'),
        path.join(__dirname, '..', 'res', value.unzippedFilenamesWithoutExtension + '.dbf'),
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

/* from object regions and their geojsons, build a single Parishes Array with Objects of the type
   {freguesia, concelho, region} for later simple processing */
function buildMetaParishes (callback) {
  try {
    const parishes = []
    for (const key1 in regions) {
      for (const key2 in regions[key1].geojson.features) {
        const geojsonParish = regions[key1].geojson.features[key2]
        parishes.push({
          parish: geojsonParish.properties.Freguesia,
          muncipality: geojsonParish.properties.Concelho,
          region: regions[key1].name
        })
        // sometimes an alternative name is available, add it also
        if (geojsonParish.properties.Des_Simpli) {
          parishes.push({
            parish: geojsonParish.properties.Des_Simpli,
            muncipality: geojsonParish.properties.Concelho,
            region: regions[key1].name
          })
        }
      }
    }

    // now removes duplicates from Array
    Parishes = parishes.filter(
      (el, index, array) => array.findIndex(
        el2 => (el2.parish === el.parish && el2.muncipality === el.muncipality && el2.region === el.region)
      ) === index
    )

    callback()
  } catch (err) {
    callback(Error(err))
  }
}

// function to test all parishes
function testAllParishes (mainCallback) {
  console.log('Test server with all parishes from geojson file,\nrequesting server with url /freguesia?nome=parish&municipio=municipality')
  const bar = new ProgressBar('[:bar] :percent :info', { total: Parishes.length + 2, width: 80 })
  async.forEachOfLimit(Parishes, 100, function (el, key, callback) {
    testParishWithMunicipality(el.parish, el.muncipality, (err, res) => {
      bar.tick({ info: `${el.muncipality.padEnd(20)} | ${el.parish.substring(0, 25)}` })
      if (err) {
        callback(Error(`Error on ${el.parish}, ${el.muncipality} : ${err}`))
      } else {
        callback()
      }
    })
  }, function (err) {
    bar.tick({ info: '' })
    bar.terminate()
    if (err) {
      mainCallback(Error(err))
    } else {
      mainCallback()
    }
  })
}

// function to test a single parish-municipality combination
function testParishWithMunicipality (parish, municipality, callback) {
  got(`http://localhost:${TEST_PORT}/freguesia?nome=${parish}&municipio=${municipality}`).json()
    .then(body => {
      if (typeof body !== 'object' || Array.isArray(body)) {
        callback(Error(`\nResult is not an object: ${JSON.stringify(body)},\n on /freguesia?nome=${parish}&municipio=${municipality}\n`))
      } else if (body.nome && !body.error) {
        callback(null, body) // success
      } else {
        callback(Error(`\nError ${body.error}, on /freguesia?nome=${parish}&municipio=${municipality}\n`))
      }
    })
    .catch(err => {
      callback(Error(`\n${err} on /freguesia?nome=${parish}&municipio=${municipality}\n`))
    })
}
