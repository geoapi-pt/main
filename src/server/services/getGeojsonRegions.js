/* Extract zip files from Carta Administrativa de Portugal (from Direção Geral do Território)
   and set it to the regions Object with respective geojson files
   The regions Object will then be exported to other modules that call this module */

const fs = require('fs')
const path = require('path')
const shapefile = require('shapefile')
const reproject = require('reproject')
const async = require('async')
const turf = require('@turf/turf')
const ProgressBar = require('progress')
const colors = require('colors/safe')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:getRegionsAndAdmins') // run: DEBUG=geoapipt:getRegionsAndAdmins npm start
const debugGeojson = require('debug')('geoapipt:geojson') // run: DEBUG=geoapipt:geojson npm start

const resDir = path.join(appRoot.path, 'res')

const { uniteParishes, removeDuplicatesArr } = require(path.join(appRoot.path, 'routines', 'generateGeojson', 'functions'))

// this Object will be filled and exported to other modules
// it has geojson data about parishes (freguesias)
const regions = {
  cont: {
    name: 'Continente',
    unzippedFilenamesWithoutExtension: 'Cont_AAD_CAOP2022',
    geojson: {}, // geojson FeatureCollection of polygons of all parishes
    projection: '' // info regarding the coordinates transformation
  },
  ArqMadeira: {
    name: 'Arquipélago da Madeira',
    unzippedFilenamesWithoutExtension: 'ArqMadeira_AAd_CAOP2022',
    geojson: {},
    projection: ''
  },
  ArqAcores_GOcidental: {
    name: 'Arquipélago dos Açores (Grupo Ocidental)',
    unzippedFilenamesWithoutExtension: 'ArqAcores_GOcidental_AAd_CAOP2022',
    geojson: {},
    projection: ''
  },
  ArqAcores_GCentral: {
    name: 'Arquipélago dos Açores (Grupo Central)',
    unzippedFilenamesWithoutExtension: 'ArqAcores_GCentral_AAd_CAOP2022',
    geojson: {},
    projection: ''
  },
  ArqAcores_GOriental: {
    name: 'Arquipélago dos Açores (Grupo Oriental)',
    unzippedFilenamesWithoutExtension: 'ArqAcores_GOriental_AAd_CAOP2022',
    geojson: {},
    projection: ''
  }
}

let bar

module.exports = function (callback) {
  bar = new ProgressBar(
    'Preparing 1/2 :percent', { total: 7 * Object.keys(regions).length }
  )
  async.series(
    [
      readShapefile, // fill in the geoson fields in the regions Object
      postProcessRegions, // post process data in the geoson fields in the regions Object
      readProjectionFile, // fill in the projection fields in the regions Object
      convertToWgs84, // convert to GPS coordinates
      mergeParishesParts, // merge parish parts; some parishes are split in separate geo objects, f.ex. due to islands
      sortParishes // sort alphabetically by name of parish
    ],
    function (err) {
      if (err) {
        console.error(err)
        callback(Error(err))
        process.exitCode = 1
      } else {
        debug('Municipalities and Parishes prepared with ' + colors.green.bold('success'))
        callback(null, regions)
      }
    })
}

// fill in the geoson fields in the regions Object
function readShapefile (mainCallback) {
  async.forEachOf(regions, function (region, key, forEachOfCallback) {
    // try calling shapefile.read 5 times, waiting 500 ms between each retry
    // see: https://github.com/mbostock/shapefile/issues/67
    async.retry({ times: 5, interval: (retryCount) => 50 * Math.pow(2, retryCount) }, function (retryCallback) {
      shapefile.read(
        path.join(resDir, 'portuguese-administrative-chart', region.unzippedFilenamesWithoutExtension + '.shp'),
        path.join(resDir, 'portuguese-administrative-chart', region.unzippedFilenamesWithoutExtension + '.dbf'),
        { encoding: 'utf-8' }
      ).then(geojson => {
        debug(
          `Shapefiles read from ${colors.cyan(region.unzippedFilenamesWithoutExtension + '.shp')} ` +
          `and from ${colors.cyan(region.unzippedFilenamesWithoutExtension + '.dbf')}`
        )
        retryCallback(null, geojson)
      }).catch((err) => {
        retryCallback(Error(err))
      })
    }, function (err, result) {
      if (err) {
        forEachOfCallback(Error(err))
      } else {
        regions[key].geojson = result
        bar.tick()
        forEachOfCallback()
      }
    })
  }, function (err) {
    if (err) {
      mainCallback(Error(err))
    } else {
      debugGeojson(regions.cont.geojson.features.filter(el => el.properties.Concelho.toLowerCase().includes('lisboa')))
      // when this debug is enabled, I just want to see the contents of geojson
      if (debugGeojson.enabled) {
        setTimeout(process.exit, 500)
      }

      setTimeout(mainCallback, 3000) // this must be here because shapefile.read is buggy
    }
  })
}

// apply some tweaks
function postProcessRegions (callback) {
  try {
    ['ArqAcores_GOcidental', 'ArqAcores_GCentral', 'ArqAcores_GOriental']
      .forEach(region => {
        regions[region].geojson.features.forEach(parish => {
          // see https://github.com/jfoclpf/geoapi.pt/issues/31
          if (!/.+\(.+\).*/.test(parish.properties.Ilha)) {
            parish.properties.Ilha += ' (Açores)'
          }
          // tweak porque há 2 "Lagoa"
          if (parish.properties.Concelho.trim() === 'Lagoa') {
            parish.properties.Concelho = 'Lagoa (Açores)'
          }
        })
      })

    callback()
  } catch (err) {
    console.error(err)
    callback(Error(err.message))
  }
}

// fill in the projection fields in the regions Object
// the system of coordinates of these map files is not ECEF (Earth-centered, Earth-fixed coordinate system)
// thus a transformation must be done according to the projection data for each region
function readProjectionFile (mainCallback) {
  async.forEachOf(regions, function (region, key, callback) {
    fs.readFile(
      path.join(resDir, 'portuguese-administrative-chart', region.unzippedFilenamesWithoutExtension + '.prj'),
      'utf8',
      (err, data) => {
        if (err) {
          callback(Error(err))
        } else {
          regions[key].projection = data
          debug(`Projection info read from ${colors.cyan(region.unzippedFilenamesWithoutExtension + '.dbf')}`)
          bar.tick()
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

// convert Coordinate Reference System (CRS) to WGS84 (used by GPS and this API)
function convertToWgs84 (callback) {
  for (const key in regions) {
    const region = regions[key]

    const geojson = region.geojson
    const geojsonWgs84 = reproject.toWgs84(geojson, region.projection)

    // calculates also centroid and bbox for each parish
    geojsonWgs84.features.forEach(parish => {
      const centros = {}
      centros.centro = turf.center(parish).geometry.coordinates
      centros.centroide = turf.centroid(parish).geometry.coordinates
      centros.centroDeMassa = turf.centerOfMass(parish).geometry.coordinates
      centros.centroMedio = turf.centerMean(parish).geometry.coordinates
      centros.centroMediano = turf.centerMedian(parish).geometry.coordinates
      parish.properties.centros = centros

      parish.bbox = turf.bbox(parish)
    })

    regions[key].geojson = geojsonWgs84
    delete regions[key].projection // not needed anymore, CRS conversion done
    bar.tick()
  }
  callback()
}

// some parishes are spread amongst different objects, for example due to islands, like Sagres
function mergeParishesParts (callback) {
  for (const key in regions) {
    // find parishes with more than one entry
    let parishes = regions[key].geojson.features
    const parishesCodes = parishes.map(el => el.properties.DICOFRE || el.properties.Dicofre)
    const codesOfDuplicatedParishes = removeDuplicatesArr(parishesCodes.filter((item, index) => parishesCodes.indexOf(item) !== index))

    codesOfDuplicatedParishes.forEach(code => {
      const spreadParish = parishes.filter(el => code === (el.properties.DICOFRE || el.properties.Dicofre))
      const compactedParish = uniteParishes(spreadParish);

      // copy some keys
      ['Freguesia', 'Concelho', 'Distrito', 'Des_Simpli'].forEach(key => {
        compactedParish.properties[key] = spreadParish[0].properties[key]
      })
      compactedParish.properties.Dicofre =
        spreadParish[0].properties.Dicofre || spreadParish[0].properties.DICOFRE
      delete compactedParish.TAA

      parishes = parishes.filter(el => code !== (el.properties.DICOFRE || el.properties.Dicofre))
      parishes.push(compactedParish)
    })

    regions[key].geojson.features = parishes
    bar.tick()
  }

  callback()
}

function sortParishes (callback) {
  for (const key in regions) {
    regions[key].geojson.features.sort((a, b) => a.properties.Freguesia.localeCompare(b.properties.Freguesia))
    bar.tick()
  }
  callback()
}
