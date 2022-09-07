/* worker for multi-thread CPU intensive processing */
const clustering = require('density-clustering')
const debug = require('debug')('geoptapi:outliers-worker')

const alpha = 10 // minimum number of points for cluster NOT to be considered as outlier
const radius = 0.008 // distance between points to be considered in the same cluster
const neighbours = 3 // minimum number of neighbours around one point to be considered a cluster

// pointsArr should be in format [[1,2][3,4],etc.]
module.exports = ({ pointsArr, CP4postalCode }) => {
  const dbscan = new clustering.DBSCAN()

  // result clusters has only the indexes of pointsArr
  // see https://www.npmjs.com/package/density-clustering#dbscan-1
  const clusters = dbscan.run(pointsArr, radius, neighbours)
  clusters.sort((a, b) => b.length - a.length) // sort clusters by size
  debug(`lengths of clusters for ${CP4postalCode}: `, clusters.map(el => el.length))

  // if a cluster has more than "alpha" points, add it to the results
  const filteredPoints = []
  clusters.forEach((cluster, i, arr) => {
    if (cluster.length >= alpha) {
      cluster.forEach(i => filteredPoints.push(pointsArr[i]))
    }
  })

  return filteredPoints
}
