const turf = require('@turf/turf')

module.exports = { uniteParishes, cloneObj, removeDuplicatesArr }

// funciton to merge array of parishes polygons into a single polygon
// used to compute municipalities, districts or to merge spread parishes (ex: with several islands)
function uniteParishes (arr) {
  const res = arr.reduce((accumulator, currentValue) => {
    const res = turf.union(accumulator, currentValue)
    res.properties.Area_T_ha = accumulator.properties.Area_T_ha + currentValue.properties.Area_T_ha
    res.properties.Area_T_ha = accumulator.properties.Area_EA_ha + currentValue.properties.Area_EA_ha
    return res
  }, arr[0])

  res.properties = {}

  const centros = {
    centro: turf.center(res).geometry.coordinates,
    centroide: turf.centroid(res).geometry.coordinates,
    centroDeMassa: turf.centerOfMass(res).geometry.coordinates,
    centroMedio: turf.centerMean(res).geometry.coordinates,
    centroMediano: turf.centerMedian(res).geometry.coordinates
  }
  res.properties.centros = centros

  res.bbox = turf.bbox(res)

  return res
}

function cloneObj (obj) {
  return Object.assign({}, obj)
}

function removeDuplicatesArr (arr) {
  return [...new Set(arr)]
}
