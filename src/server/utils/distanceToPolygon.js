const turf = require('@turf/turf')

module.exports = distanceToPolygon

// Returns distance in meters (negative values for points inside) from a point to the edges of a polygon
function distanceToPolygon ({ point, polygon }) {
  if (polygon.type === 'Feature') { polygon = polygon.geometry }
  let distance
  if (polygon.type === 'MultiPolygon') {
    distance = polygon.coordinates
      .map(coords => distanceToPolygon({ point, polygon: turf.polygon(coords).geometry }))
      .reduce((smallest, current) => (current < smallest ? current : smallest))
  } else {
    if (polygon.coordinates.length > 1) {
      // Has holes
      const [exteriorDistance, ...interiorDistances] = polygon.coordinates.map(coords =>
        distanceToPolygon({ point, polygon: turf.polygon([coords]).geometry })
      )
      if (exteriorDistance < 0) {
        // point is inside the exterior polygon shape
        const smallestInteriorDistance = interiorDistances.reduce(
          (smallest, current) => (current < smallest ? current : smallest)
        )
        if (smallestInteriorDistance < 0) {
          // point is inside one of the holes (therefore not actually inside this shape)
          distance = smallestInteriorDistance * -1
        } else {
          // find which is closer, the distance to the hole or the distance to the edge of the exterior, and set that as the inner distance.
          distance = smallestInteriorDistance < exteriorDistance * -1
            ? smallestInteriorDistance * -1
            : exteriorDistance
        }
      } else {
        distance = exteriorDistance
      }
    } else {
      // The actual distance operation - on a normal, hole-less polygon (converted to meters)
      distance = turf.pointToLineDistance(point, turf.polygonToLineString(polygon)) * 1000
      if (turf.booleanPointInPolygon(point, polygon)) {
        distance = distance * -1
      }
    }
  }
  return distance
}
