const fs = require('fs')
const path = require('path')
const http = require('http')
const url = require('url')
const shapefile = require('shapefile')
const PolygonLookup = require('polygon-lookup')
const proj4 = require('proj4')
const extract = require('extract-zip')
const async = require('async')
const debug = require('debug')('http')
const commandLineArgs = require('command-line-args')

const filenameWithoutExtension = 'Cont_AAD_CAOP2020'

const serverPort = process.env.npm_config_port ||
                   commandLineArgs([{ name: 'port', type: Number }]).port ||
                   '8080'

let geojson
let projection

// extracts zip file with shapefile and projection files
function extractZip (callback) {
  const zipFile = path.join(__dirname, 'res', filenameWithoutExtension + '.zip')
  extract(zipFile, { dir: path.join(__dirname, 'res') })
    .then(() => {
      console.log('zip file extraction complete')
      callback()
    })
    .catch((errOnUnzip) => {
      callback(Error('Error unziping file ' + zipFile + '. ' + errOnUnzip.message))
    })
}

function readShapefile (callback) {
  shapefile.read(
    path.join(__dirname, 'res', filenameWithoutExtension + '.shp'),
    path.join(__dirname, 'res', filenameWithoutExtension + '.dbf'),
    { encoding: 'utf-8' }
  ).then(geojsonLoc => {
    geojson = geojsonLoc
    console.log(`Shapefiles read from ${filenameWithoutExtension}.shp and ${filenameWithoutExtension}.dbf`)
    callback()
  }).catch((error) => {
    console.error(error.stack)
    callback(Error('Error reading shapefile'))
  })
}

function readProjectionFile (callback) {
  fs.readFile(
    path.join(__dirname, 'res', filenameWithoutExtension + '.prj'),
    'utf8',
    (err, data) => {
      if (err) {
        callback(Error(err))
      } else {
        projection = data
        console.log(`Projection info read from ${filenameWithoutExtension}.prj`)
        callback()
      }
    })
}

function startServer (callback) {
  http.createServer(function (req, res) {
    try {
      if (req.url.includes('favicon.ico')) {
        res.writeHead(204) // no content
        res.end()
        return
      }

      const searchParams = url.parse(req.url, true).query // eslint-disable-line

      const lat = parseFloat(searchParams.lat) // ex: 40.153687
      const lon = parseFloat(searchParams.lon) // ex: -8.514602

      const point = [lon, lat] // longitude, latitude
      const transformedPoint = proj4(projection, point)

      const lookupFreguesias = new PolygonLookup(geojson)
      const freguesia = lookupFreguesias.search(transformedPoint[0], transformedPoint[1])

      if (freguesia) {
        debug('Found freguesia')
        const local = {
          freguesia: freguesia.properties.Freguesia,
          concelho: freguesia.properties.Concelho,
          distrito: freguesia.properties.Distrito
        }
        debug(local)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.write(JSON.stringify(local))
        res.end()
      } else {
        debug('Results not found')
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.write('Results not found. Coordinates out of scope!')
        res.end()
      }
    } catch (e) {
      debug('Error no server')
      debug(e)
      res.writeHead(400, { 'Content-Type': 'text/plain' })
      res.write(`Wrong request! Example of good request: ${req.headers.host || ''}/?lat=40.153687&lon=-8.514602`)
      res.end()
    }
  }).listen(serverPort, () => {
    console.log(`Server initiated on port ${serverPort}, check for example:`)
    console.log('\x1b[36m%s\x1b[0m', `http://localhost:${serverPort}/?lat=40.153687&lon=-8.514602`)
  })
}

async.series([extractZip, readShapefile, readProjectionFile, startServer],
  function (err) {
    if (err) {
      console.error(err)
      process.exitCode = 1
    } else {
      console.log('Everything done with success')
    }
  })
