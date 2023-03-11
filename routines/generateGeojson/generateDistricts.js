/* From Carta Administrativa with all GeoJSON files of parishes,
   generates GeoJSON files of districts */

const fs = require('fs')
const path = require('path')
const ProgressBar = require('progress')
const appRoot = require('app-root-path')

const getGeojsonRegions = require(path.join(appRoot.path, 'src', 'server', 'services', 'getGeojsonRegions.js'))

const municipalitiesGeojsonDir = path.join(appRoot.path, 'res', 'geojson', 'municipalities')
const districtsGeojsonDir = path.join(appRoot.path, 'res', 'geojson', 'districts')

const { uniteParishes, cloneObj } = require(path.join(__dirname, 'functions'))

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
      geojsonDistricts[key].distrito = uniteParishes(geojsonDistricts[key].freguesias)
    } else if (geojsonDistricts[key].freguesias.length === 1) {
      geojsonDistricts[key].distrito = cloneObj(geojsonDistricts[key].freguesias[0])
    } else {
      console.error(geojsonDistricts[key])
      throw Error('wrong length')
    }

    geojsonDistricts[key].distrito.properties.Dicofre = key

    // adds municipalities geosjons corresponding to this district
    geojsonDistricts[key].municipios = []
    fs.readdirSync(municipalitiesGeojsonDir).forEach(filename => {
      if (path.parse(filename).name.padStart(4, '0').slice(0, 2) === key) {
        const municipalityGeojson = JSON.parse(fs.readFileSync(path.join(municipalitiesGeojsonDir, filename)))
        geojsonDistricts[key].municipios.push(municipalityGeojson.municipio)
      }
    })

    geojsonDistricts[key].distrito.properties.Distrito =
      geojsonDistricts[key].municipios[0].properties.Distrito

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
