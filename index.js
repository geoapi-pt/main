const fs = require('fs')
const path = require('path')
const shapefile = require('shapefile')
const PolygonLookup = require('polygon-lookup')
const proj4 = require('proj4')
const extract = require('extract-zip')
const async = require('async')

const filenameWithoutExtension = 'Cont_AAD_CAOP2020'

let geojson
let projection

// extracts zip file with polygons
function extractZip (callback) {
  const zipFile = path.join(__dirname, 'res', filenameWithoutExtension + '.zip')
  console.log(zipFile)
  extract(zipFile, { dir: path.join(__dirname, 'res') })
    .then(() => {
      console.log('Extraction complete')
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
        console.log('Projection info is: ' + projection)
        callback()
      }
    })
}

function getFreguesia (callback) {
  const lat = 40.153687
  const lon = -8.514602

  const point = [lon, lat] // longitude, latitude

  console.log(point)
  const transformedPoint = proj4(projection, point)
  console.log(transformedPoint)

  const lookupFreguesias = new PolygonLookup(geojson)
  const freguesia = lookupFreguesias.search(transformedPoint[0], transformedPoint[1])
  console.log(freguesia)
  callback()
}

async.series([extractZip, readShapefile, readProjectionFile, getFreguesia],
  function (err) {
    if (err) {
      console.error(err)
      process.exitCode = 1
    } else {
      console.log('Everything done with success')
    }
  })
