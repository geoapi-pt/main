/* From Carta Administrativa with all GeoJSON files of parishes,
   generates GeoJSON files of districts */

const fs = require('fs')
const path = require('path')
const turf = require('@turf/turf')
const ProgressBar = require('progress')
const appRoot = require('app-root-path')

const getGeojsonRegions = require(path.join(appRoot.path, 'src', 'server', 'services', 'getGeojsonRegions.js'))

const districtsGeojsonDir = path.join(appRoot.path, 'res', 'geojson', 'districts')

let regions

// geojson data for districts (aglomerated from parishes geojson data)
// each key is a district INE code
const geojsonDistricts = {}

getGeojsonRegions((err, _regions) => {
  if (!err) {
    regions = _regions
    generategeojsonDistricts()
    saveFiles()
    console.log(`GeoJSON files generated OK into ${path.relative(appRoot.path, districtsGeojsonDir)}`)
  }
})

function generategeojsonDistricts () {
  let bar = new ProgressBar(
    'Linking parishes to districts :percent', { total: Object.keys(regions).length }
  )

  // join parishes that correspond to the same district
  for (const key in regions) {
    regions[key].geojson.features.forEach(parish => {
      const codigoine = parish.properties.DICOFRE || parish.properties.Dicofre
      if (codigoine.length !== 6) {
        console.error(parish)
        throw Error('Codigo INE for parish must have 6 digits')
      } else {
        // the district code are the first 2 digits out of 6 digits
        const districtCode = codigoine.slice(0, 2)

        if (geojsonDistricts.hasOwnProperty(districtCode)) {  // eslint-disable-line
          geojsonDistricts[districtCode].freguesias.push(cloneObj(parish))
        } else {
          geojsonDistricts[districtCode] = {}
          geojsonDistricts[districtCode].freguesias = [cloneObj(parish)]
        }
      }
    })
    bar.tick()
  }

  bar = new ProgressBar(
    'Merging parishes into districts :percent', { total: Object.keys(geojsonDistricts).length }
  )

  // now merge parishes geojson for each district and compute bbox and centers
  for (const key in geojsonDistricts) {
    if (geojsonDistricts[key].freguesias.length >= 2) {
      geojsonDistricts[key].distrito =
        geojsonDistricts[key].freguesias.reduce(
          (accumulator, currentValue) => turf.union(accumulator, currentValue),
          geojsonDistricts[key].freguesias[0]
        )
    } else if (geojsonDistricts[key].freguesias.length === 1) {
      geojsonDistricts[key].distrito = cloneObj(geojsonDistricts[key].freguesias[0])
    } else {
      console.error(geojsonDistricts[key])
      throw Error('wrong length')
    }

    geojsonDistricts[key].distrito.properties = { Dicofre: key }
    geojsonDistricts[key].distrito.bbox = turf.bbox(geojsonDistricts[key].distrito)

    const centros = {}
    centros.centro = turf.center(geojsonDistricts[key].distrito).geometry.coordinates
    centros.centroide = turf.centroid(geojsonDistricts[key].distrito).geometry.coordinates
    centros.centroDeMassa = turf.centerOfMass(geojsonDistricts[key].distrito).geometry.coordinates
    centros.centroMedio = turf.centerMean(geojsonDistricts[key].distrito).geometry.coordinates
    centros.centroMediano = turf.centerMedian(geojsonDistricts[key].distrito).geometry.coordinates
    geojsonDistricts[key].distrito.properties.centros = centros

    bar.tick()
  }
}

function saveFiles () {
  for (const key in geojsonDistricts) {
    fs.writeFileSync(
      path.join(districtsGeojsonDir, key + '.json'),
      JSON.stringify(geojsonDistricts[key])
    )
  }
}

function cloneObj (obj) {
  return Object.assign({}, obj)
}
