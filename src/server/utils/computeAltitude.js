/* Calculate altitude by computing the plane of the 3 nearest points which form a triangle which
   contains the point(lat, lon). Then project the point(lat, lon) into that plane and find Z (altitude)
   https://stackoverflow.com/q/74640650/1243247
   It does by finding the N nearest (nNearest) points and then from those points computing
   the possible triangles that include the point(lat, lon) */

const nNearest = 10

const fs = require('fs')
const path = require('path')
const turf = require('@turf/turf')
const appRoot = require('app-root-path')
const sphereKnn = require('sphere-knn')

module.exports = computeAltitude

// preload points of altimetry
const altimetryFilePath = path.join(appRoot.path, 'res', 'altimetria', 'altimetria.geojson')
const altimetryLookup = sphereKnn(
  JSON.parse(fs.readFileSync(altimetryFilePath)).features
    .map(feature => Object(
      {
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        alt: parseFloat(feature.properties.H_topo_)
      }
    ))
)

function computeAltitude (lat, lon) {
  let altitude

  const nearestPoints = altimetryLookup(lat, lon, nNearest, 5000)
  if (nearestPoints && nearestPoints.length >= 3) {
    const point = turf.point([lat, lon])

    permutation(nearestPoints, 3).every(perm => {
      const triangle = turf.polygon([[
        [perm[0].lat, perm[0].lon],
        [perm[1].lat, perm[1].lon],
        [perm[2].lat, perm[2].lon],
        [perm[0].lat, perm[0].lon]
      ]], {
        a: perm[0].alt,
        b: perm[1].alt,
        c: perm[2].alt
      })
      if (turf.booleanPointInPolygon(point, triangle)) {
        altitude = turf.planepoint(point, triangle)
        return false // break loop
      } else {
        return true
      }
    })

    if (altitude) {
      return Math.round(altitude)
    } else {
      // point does not fall within any possible triangle of nearest N points
      // (for example, point close to border or sea), just get average of 2 nearest points
      altitude = (nearestPoints[0].alt + nearestPoints[1].alt) / 2
      return Math.round(altitude)
    }
  } else if (nearestPoints.length === 2) {
    altitude = (nearestPoints[0].alt + nearestPoints[1].alt) / 2
    return Math.round(altitude)
  } else {
    return null
  }
}

// do permutations of N elements of array without repetition
// https://stackoverflow.com/a/62854671/1243247
function permutation (array, length) {
  return array.flatMap((v, i) => length > 1
    ? permutation(array.slice(i + 1), length - 1).map(w => [v, ...w])
    : [[v]]
  )
}
