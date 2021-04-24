const path = require('path')
const shapefile = require('shapefile')
const PolygonLookup = require('polygon-lookup')

shapefile.read(
  path.join('res', 'Cont_Troco_CAOP2020.shp'),
  path.join('res', 'Cont_Troco_CAOP2020.dbf'),
  { encoding: 'utf-8' }
).then(geojson => {
  const point = {
    lat: 0, // 39.93431895133549,
    lon: 0 // -8.545575208651075
  }
  console.log(geojson.features[0])
  /* for (const key in geojson.features) {
    console.log(geojson.features[key].properties.Concelho)
  } */
  const lookupFreguesias = new PolygonLookup(geojson)
  const freguesia = lookupFreguesias.search(point.lon, point.lat)
  console.log(freguesia)
  // console.log(freguesia.geometry.coordinates)
}).catch((error) => {
  console.error('Error reading freguesias')
  console.error(error.stack)
  process.exitCode = 1
})
