/* worker for multi-thread CPU intensive processing */
const { dbscan } = require('outliers2d')

const alpha = 10 // minimum number of points for cluster NOT to be considered as outlier
const radius = 0.008 // distance between points to be considered in the same cluster
const neighbours = 3 // minimum number of neighbours around one point to be considered a cluster

// pointsArr should be in format [[1,2][3,4],etc.]
module.exports = ({ pointsArr }) => {
  const { filteredPoints, outliers } = dbscan(pointsArr, alpha, radius, neighbours)
  return { filteredPoints, outliers }
}
