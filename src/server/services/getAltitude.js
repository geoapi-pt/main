const fs = require('fs')
const path = require('path')
const turf = require('@turf/turf')
const async = require('async')
const ProgressBar = require('progress')
const PolygonLookup = require('polygon-lookup')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:getAltitude')

const computeAltitude = require(path.join(appRoot.path, 'src', 'server', 'utils', 'computeAltitude.js'))

const tifDirectory = path.resolve(appRoot.path, '..', 'resources', 'res', 'altimetria', 'tif', 'source-tiles')
const commonsDir = path.resolve(appRoot.path, '..', 'resources', 'routines', 'commons')

// instance to lookup for tiles, i,e., detect in which tile the point lies
let lookup

module.exports = { init, get }

function init (callback) {
  const { getFiles } = require(path.join(commonsDir, 'file.js'))

  // collection of geoJson polygons (boxes) with the coordinates of the corresponding TIF tiles
  const tilesCollection = []

  getFiles(tifDirectory).then(async files => {
    const tifFiles = files.filter(f => path.extname(f) === '.tif')

    let bar
    if (!debug.enabled) {
      bar = new ProgressBar(
        'Preparing 3/3 :percent', { total: tifFiles.length * 2 }
      )
    } else {
      bar = { tick: () => {} }
    }

    const { fromArrayBuffer } = await import('geotiff')
    async.each(tifFiles, async (tifFile) => {
      bar.tick()
      const arrBuffer = fs.readFileSync(tifFile).buffer

      const tiff = await fromArrayBuffer(arrBuffer)
      const image = await tiff.getImage() // by default, the first image is read.

      const tile = turf.bboxPolygon(image.getBoundingBox())
      tile.properties.filename = tifFile
      tile.properties.image = image
      tilesCollection.push(tile)
      bar.tick()
    }, (err) => {
      if (err) {
        console.error('Error processing geoTIF tiles', err)
        callback(Error('Error processing geoTIF tiles'))
      } else {
        const collection = turf.featureCollection(tilesCollection)
        lookup = new PolygonLookup(collection)
        debug('geoTIF tiles for altimetry processed OK')
        callback()
      }
    })
  })
}

async function get ({ lat, lon }) {
  debug(`Get altitude for ${lat.toFixed(6)},${lon.toFixed(6)}`)
  let altitude
  try {
    const tile = lookup.search(lon, lat)

    const image = tile.properties.image

    const rasters = await image.readRasters()

    // Construct the WGS-84 forward and inverse affine matrices:
    const { ModelPixelScale: s, ModelTiepoint: t } = image.fileDirectory
    let [sx, sy, sz] = s // eslint-disable-line
    const [px, py, k, gx, gy, gz] = t // eslint-disable-line
    sy = -sy // WGS-84 tiles have a "flipped" y component

    const gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy]
    debug(`Looking up GPS coordinate (${lat.toFixed(6)},${lon.toFixed(6)})`)

    const [x, y] = transform(lon, lat, gpsToPixel, true)
    debug(`Corresponding tile pixel coordinate: [${x}][${y}]`)

    // Finally, retrieve the elevation associated with this pixel's geographic area:
    const { width, 0: raster } = rasters
    altitude = Math.round(raster[x + y * width])
    debug(`The altitude at (${lat.toFixed(6)},${lon.toFixed(6)}) is ${altitude}m`)
  } catch {
    altitude = computeAltitude(lat, lon)
  }
  return altitude
}

function transform (a, b, M, roundToInt = false) {
  const round = (v) => (roundToInt ? v | 0 : v)
  return [
    round(M[0] + M[1] * a + M[2] * b),
    round(M[3] + M[4] * a + M[5] * b)
  ]
}
