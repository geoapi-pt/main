/* Get geo Data from Nominatim (nominatim.org), the geo API from Open Street Maps */

const got = require('got')

const openElevationApiBaseUrl = 'https://api.open-elevation.com/api/v1'

module.exports = getOpenElevationData

function getOpenElevationData ({ req, lat, lon, local }, callback) {
  const referer = `${req.get('origin') || ''}/gps/${lat},${lon}`

  got(`${openElevationApiBaseUrl}/lookup?locations=${lat},${lon}`,
    {
      headers: { Referer: referer },
      timeout: {
        lookup: 100,
        connect: 50,
        secureConnect: 50,
        socket: 1000,
        send: 2000,
        response: 1000
      }
    })
    .json()
    .then(res => {
      if (res.results && Array.isArray(res.results)) {
        local.altitude_m = res.results[0].elevation
      }
      callback()
    })
    .catch((err) => {
      if (err) {
        console.error('Open Elevation service unavailable', err)
      }
      callback()
    })
}
