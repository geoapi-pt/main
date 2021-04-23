const path = require('path')
const shapefile = require('shapefile')
const async = require('async')

const shapeFiles = {
  freguesias: 'Cont_AAD_CAOP2017',
  concelhos: 'concelhos',
  distritos: 'distritos'
}

const geojson = {}

async.forEachOf(shapeFiles, (value, key, callback) => {
  shapefile.read(
    path.join('res', value + '.shp'),
    path.join('res', value + '.dbf'),
    { encoding: 'utf-8' }
  ).then(geojsonLoc => {
    geojson[key] = geojsonLoc
    callback()
  }).catch((error) => {
    console.error('Error reading freguesias')
    callback(error.stack)
  })
}, err => {
  if (err) {
    console.error(err.message)
    process.exitCode = 1
  } else {
    console.log(geojson)
  }
})
