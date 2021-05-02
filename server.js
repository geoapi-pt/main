const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
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

// for municipalities and parishes
const administrations = {
  freguesiasDetails: [], // array with details of freguesias
  municipiosDetails: [], // array with details of municípios
  listOfFreguesiasNames: [], // an array with just names/strings of freguesias
  listOfMunicipiosNames: [] // an array with just names/strings of municipios
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

      // now fill in listOfFreguesiasNames
      for (const parish of geojson.features) {
        administrations.listOfFreguesiasNames.push(
          parish.properties.Freguesia + ` (${parish.properties.Concelho})`
        )
        administrations.listOfMunicipiosNames.push(parish.properties.Concelho)
      }

      callback()
    }).catch((error) => {
      console.error(error.stack)
      callback(Error('Error reading shapefile'))
    })
  }, function (err) {
    if (err) {
      mainCallback(Error(err))
    } else {
      // remove duplicates in arrays
      administrations.listOfFreguesiasNames = [...new Set(administrations.listOfFreguesiasNames)]
      administrations.listOfMunicipiosNames = [...new Set(administrations.listOfMunicipiosNames)]
      // sort alphabetically arrays
      administrations.listOfFreguesiasNames = administrations.listOfFreguesiasNames.sort()
      administrations.listOfMunicipiosNames = administrations.listOfMunicipiosNames.sort()

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
    administrations.freguesiasDetails = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', 'detalhesFreguesias.json'), 'utf8')
    ).d
    console.log(colors.cyan('detalhesFreguesias.json') + ' read with success')

    administrations.municipiosDetails = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', 'detalhesMunicipios.json'), 'utf8')
    ).d
    console.log(colors.cyan('detalhesMunicipios.json') + ' read with success')
  } catch (e) {
    console.error(e)
    mainCallback(Error(e))
  }

  mainCallback()
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

      debug('new query: ', req.query)
      const lat = parseFloat(req.query.lat) // ex: 40.153687
      const lon = parseFloat(req.query.lon) // ex: -8.514602
      const isDetails = Boolean(parseInt(req.query.detalhes))

      const point = [lon, lat] // longitude, latitude

      for (const key in regions) {
        const transformedPoint = proj4(regions[key].projection, point)

        const lookupFreguesias = new PolygonLookup(regions[key].geojson)
        const freguesia = lookupFreguesias.search(transformedPoint[0], transformedPoint[1])

        if (freguesia) {
          debug('Found freguesia: ', freguesia)
          const local = {
            freguesia: freguesia.properties.Freguesia,
            concelho: freguesia.properties.Concelho,
            distrito: freguesia.properties.Distrito
          }

          if (isDetails) {
            // search for details for parishes (freguesias)
            const numberOfParishes = administrations.freguesiasDetails.length
            const Dicofre = parseInt(freguesia.properties.Dicofre)
            for (let i = 0; i < numberOfParishes; i++) {
              if (Dicofre === parseInt(administrations.freguesiasDetails[i].codigoine)) {
                local.detalhesFreguesia = administrations.freguesiasDetails[i]
                // delete superfluous fields
                delete local.detalhesFreguesia.PartitionKey
                delete local.detalhesFreguesia.RowKey
                delete local.detalhesFreguesia.Timestamp
                delete local.detalhesFreguesia.entityid

                break // found it, break loop
              }
            }

            // search for details for municipalities (municipios)
            const numberOfMunicipalities = administrations.municipiosDetails.length
            const concelho = freguesia.properties.Concelho.toLowerCase().trim()
            for (let i = 0; i < numberOfMunicipalities; i++) {
              if (concelho === administrations.municipiosDetails[i].entidade.toLowerCase().trim()) {
                local.detalhesMunicipio = administrations.municipiosDetails[i]
                // delete superfluous fields
                delete local.detalhesMunicipio.PartitionKey
                delete local.detalhesMunicipio.RowKey
                delete local.detalhesMunicipio.Timestamp
                delete local.detalhesMunicipio.entityid

                break // found it, break loop
              }
            }
          }

          debug(local)

          res.set('Content-Type', 'application/json')
          res.status(200)
          res.send(JSON.stringify(local))
          res.end()
          return
        }
      }

      debug('Results not found')

      res.status(404)
      res.send({ error: 'Results not found. Coordinates out of scope!' })
      res.end()
    } catch (e) {
      debug('Error on server', e)

      res.status(400)
      res.send({ error: 'Wrong request! Example of good request:  /?lat=40.153687&lon=-8.514602' })
      res.end()
    }
  })

  app.get('/listaDeFreguesias', function (req, res) {
    res.set('Content-Type', 'application/json')
    res.status(200)
    res.send(JSON.stringify(administrations.listOfFreguesiasNames))
    res.end()
  })

  app.get('/listaDeMunicipios', function (req, res) {
    res.set('Content-Type', 'application/json')
    res.status(200)
    res.send(JSON.stringify(administrations.listOfMunicipiosNames))
    res.end()
  })

  app.use(function (req, res) {
    debug('Not Found')
    res.sendStatus(404)
  })

  app.listen(serverPort, () => {
    console.log(`Server initiated on port ${serverPort}, check for example:`)
    console.log(colors.green(`http://localhost:${serverPort}/?lat=40.153687&lon=-8.514602`))
  })

  callback()
}

async.series([extractZip, readShapefile, readProjectionFile, readJsonFiles, startServer],
  function (err) {
    if (err) {
      console.error(err)
      process.exitCode = 1
    } else {
      console.log('Everything done with ' + colors.green.bold('success'))
      debug(regions)
    }
  })
