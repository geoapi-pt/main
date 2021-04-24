const path = require('path')
const shapefile = require('shapefile')
const PolygonLookup = require('polygon-lookup')
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
    const point = {
      lat: 38.569566888238924,
      lon: -7.905490149218761
    }
    const lookupDistritos = new PolygonLookup(geojson.distritos)
    const distrito = lookupDistritos.search(point.lon, point.lat)
    console.log(distrito.properties.NAME_1)
  }
})
