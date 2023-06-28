/* From Carta Administrativa with all GeoJSON files of parishes,
   generates GeoJSON files of municipalities */

const fs = require('fs')
const path = require('path')
const geojsonhint = require('@mapbox/geojsonhint')
const exec = require('child_process').execSync
const ProgressBar = require('progress')
const appRoot = require('app-root-path')

const getGeojsonRegions = require(path.join(appRoot.path, 'src', 'server', 'services', 'getGeojsonRegions.js'))

const parishesGeojsonDir = path.join(appRoot.path, 'res', 'geojson', 'parishes')

const commonsDir = path.join(appRoot.path, 'routines', 'commons')
const { validateAllJsonFilesAsGeojson, createDirIfNotExist } = require(path.join(commonsDir, 'file.js'))

// check if CLI command ogr2ogr is available
if (exec('ogr2ogr --version').toString().includes('GDAL')) {
  console.log('ogr2ogr is available')
  console.log(exec('ogr2ogr --version').toString())
} else {
  console.log('ogr2ogr not available')
  console.log(exec('ogr2ogr --version').toString())
  process.exit(1)
}

let regions

getGeojsonRegions((err, _regions) => {
  if (!err) {
    regions = _regions
    generateGeojsonParishes()
    validateGeojsonFiles(() => {
      console.log(`GeoJSON files generated OK into ${path.relative(appRoot.path, parishesGeojsonDir)}`)
    })
  }
})

function generateGeojsonParishes () {
  // count number of parishes
  let totalNumberOfFeatures = 0
  for (const key in regions) {
    totalNumberOfFeatures += regions[key].geojson.features.length
  }

  const bar = new ProgressBar(
    '[:bar] :percent :info', { total: totalNumberOfFeatures + 1, width: 80 }
  )

  // join parishes that correspond to the same municipality
  for (const key in regions) {
    regions[key].geojson.features.forEach(parish => {
      const codigoine = parish.properties.DICOFRE || parish.properties.Dicofre
      if (codigoine.length !== 6) {
        console.error(parish)
        throw Error('Codigo INE for parish must have 6 digits')
      } else {
        const districtCode = codigoine.slice(0, 2)
        const municipalityCode = codigoine.slice(2, 4)
        const parishCode = codigoine.slice(4, 6)

        const file = path.join(parishesGeojsonDir, districtCode, municipalityCode, parishCode + '.geojson')

        createDirIfNotExist(path.dirname(file))
        const geojsonString = JSON.stringify(parish)

        // lint to check if is valid
        const lintErrors = geojsonhint.hint(geojsonString, { precisionWarning: false })
        if (
          Array.isArray(lintErrors) &&
          lintErrors.length &&
          lintErrors.some(el => el.message.includes('right-hand rule'))
        ) {
          // there's an error related with right-hand rule, correct geojson file with ogr2ogr
          // see https://gis.stackexchange.com/a/312356/182228
          fs.writeFileSync(file + '.tmp', geojsonString)
          exec(`ogr2ogr -f GeoJSON -lco RFC7946=YES ${file} ${file + '.tmp'}`)

          // check again to be sure is correct
          const lintErrors = geojsonhint.hint(fs.readFileSync(file, 'utf-8'), { precisionWarning: false })
          if (
            Array.isArray(lintErrors) &&
            lintErrors.length
          ) {
            console.error(lintErrors)
            console.log(fs.readFileSync(file, 'utf-8'))
            throw Error(`Geojson ${path.relative(appRoot.path, file)} has yet some errors`)
          } else {
            // everything now OK, delete temp file
            fs.unlinkSync(file + '.tmp')
          }
        } else {
          // nothing to correct, just write geojson file
          fs.writeFileSync(file, geojsonString)
        }

        bar.tick({ info: path.relative(appRoot.path, file) })
      }
    })
  }
  bar.tick({ info: '' })
}

function validateGeojsonFiles (callback) {
  console.log('Validating generated Geojson files (with another tool)')
  validateAllJsonFilesAsGeojson(parishesGeojsonDir, callback)
}
