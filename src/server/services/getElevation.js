/* Get elevation from
 - Open elevation API (external)
 - Open Topo Data API (external)
 - Open Topo Data API (internal with docker)
and returns the first to reply OK */

const fs = require('fs')
const path = require('path')
const got = require('got')
const async = require('async')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server:getelevation')

const openElevationApiBaseUrl = 'https://api.open-elevation.com/api/v1/lookup'

// see https://www.opentopodata.org/datasets/eudem/
const openTopoDataApiBaseUrl = 'https://api.opentopodata.org/v1/eudem25m'

const openTopoDataApiDockerPort = JSON.parse(
  fs.readFileSync(path.join(appRoot.path, 'configs.json'))
).openTopoDataApiDockerPort
const openTopoDataApiDockerUrl = `http://localhost:${openTopoDataApiDockerPort}/v1/eudem25m`

module.exports = getOpenElevationData

function getOpenElevationData ({ req, lat, lon }, mainCallback) {
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

  let altitude

  async.some([openTopoDataApiDockerUrl, openElevationApiBaseUrl, openTopoDataApiBaseUrl],
    (apiBaseUrl, callback) => {
      got(`${apiBaseUrl}?locations=${lat},${lon}`, options)
        .json()
        .then(res => {
          if (res.results && Array.isArray(res.results)) {
            altitude = Math.round(res.results[0].elevation)
            debug(`used ${apiBaseUrl} to get elevation`)
            callback(null, true)
          } else {
            callback(null, false)
          }
        })
        .catch(err => {
          callback(Error(`${apiBaseUrl} service unavailable. ${err.message}`), false)
        })
    },
    (err, res) => {
      if (err) {
        mainCallback(Error(err.message))
      } else if (!res) {
        mainCallback(Error('None of the services got elevation'))
      } else {
        debug('altitude: ' + altitude)
        mainCallback(null, altitude)
      }
    })
}
