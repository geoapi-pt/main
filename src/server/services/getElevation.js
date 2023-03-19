/* Get elevation from two different services in parallel, return the first to reply */

const got = require('got')
const async = require('async')

const openElevationApiBaseUrl = 'https://api.open-elevation.com/api/v1/lookup'

// see https://www.opentopodata.org/datasets/eudem/
const openTopoDataApiBaseUrl = 'https://api.opentopodata.org/v1/eudem25m'

module.exports = getOpenElevationData

function getOpenElevationData ({ req, lat, lon, local }, mainCallback) {
  const referer = `${req.get('origin') || ''}/gps/${lat},${lon}`

  const options = {
    headers: { Referer: referer },
    timeout: {
      lookup: 100,
      connect: 50,
      secureConnect: 50,
      socket: 1000,
      send: 2000,
      response: 1000
    }
  }

  async.some([openElevationApiBaseUrl, openTopoDataApiBaseUrl],
    (apiBaseUrl, callback) => {
      got(`${apiBaseUrl}?locations=${lat},${lon}`, options)
        .json()
        .then(res => {
          if (res.results && Array.isArray(res.results)) {
            local.altitude_m = Math.round(res.results[0].elevation)
          }
          callback(null, true)
        })
        .catch(err => {
          callback(Error(`${apiBaseUrl} service unavailable. ${err.message}`), false)
        })
    },
    (err, result) => {
      if (err) {
        mainCallback(Error(err.message))
      } else {
        mainCallback()
      }
    })
}
