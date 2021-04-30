const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const url = require('url')
const shapefile = require('shapefile')
const PolygonLookup = require('polygon-lookup')
const proj4 = require('proj4')
const extract = require('extract-zip')
const async = require('async')
const debug = require('debug')('http')
const commandLineArgs = require('command-line-args')
const colors = require('colors/safe')

const serverPort = process.env.npm_config_port ||
                   commandLineArgs([{ name: 'port', type: Number }]).port ||
                   '8080'

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

function startServer (callback) {
  const app = express()
  app.use(cors())

  app.get('/', function (req, res) {
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

      for (const key in regions) {
        const transformedPoint = proj4(regions[key].projection, point)

        const lookupFreguesias = new PolygonLookup(regions[key].geojson)
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
          return
        }
      }

      debug('Results not found')
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.write('Results not found. Coordinates out of scope!')
      res.end()
    } catch (e) {
      debug('Error on server')
      debug(e)
      res.writeHead(400, { 'Content-Type': 'text/plain' })
      res.write('Wrong request! Example of good request:  /?lat=40.153687&lon=-8.514602')
      res.end()
    }
  })

  app.listen(serverPort, () => {
    console.log(`Server initiated on port ${serverPort}, check for example:`)
    console.log(colors.green(`http://localhost:${serverPort}/?lat=40.153687&lon=-8.514602`))
  })

  callback()
}

async.series([extractZip, readShapefile, readProjectionFile, startServer],
  function (err) {
    if (err) {
      console.error(err)
      process.exitCode = 1
    } else {
      console.log('Everything done with ' + colors.green.bold('success'))
      debug(regions)
    }
  })
