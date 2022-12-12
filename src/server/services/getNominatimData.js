/* Get geo Data from Nominatim (nominatim.org), the geo API from Open Street Maps */

const got = require('got')

const nominatimReverseBaseUrl = 'https://nominatim.openstreetmap.org/reverse'

module.exports = getNominatimData

function getNominatimData ({ req, lat, lon, local }, callback) {
  const referer = `${req.get('origin') || ''}/gps/${lat},${lon}`

  got(`${nominatimReverseBaseUrl}?lat=${lat}&lon=${lon}&format=json&accept-language=pt-PT`,
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
    .then(result => {
      if (result.address) {
        const address = result.address
        local.rua = address.road
        local.n_porta = address.house_number
        local.CP = address.postcode
      }
      callback()
    })
    .catch((err) => {
      if (err) {
        console.error('Open Street Map Nominatim service unavailable', err.message)
      }
      callback()
    })
}
