const PolygonLookup = require('polygon-lookup')
const proj4 = require('proj4')
const path = require('path')
const debug = require('debug')('geoptapi:server')
const { normalizeName } = require(path.join(__dirname, '..', '..', 'commonFunctions.js'))

module.exports = {
  fn: routeFn,
  route: ['/gps', '/gps/:lat?,:lon?']
}

function routeFn (req, res, next, { administrations, regions, mainPageUrl }) {
  try {
    debug('new query: ', req.query)
    debug(req.headers, req.params)

    // check that lat and lon are valid numbers
    const isNumeric = function (str) {
      if (typeof str !== 'string') return false
      return !isNaN(str) && !isNaN(parseFloat(str))
    }

    // use url format /gps/lat,lon
    if (isNumeric(req.params.lat) && isNumeric(req.params.lon)) {
      req.query.lat = req.params.lat
      req.query.lon = req.params.lon
    }

    // ### validate request query ###
    // query parameters must be "lat and lon" or "lat, lon and detalhes"
    const parameters = Object.keys(req.query)
    const isQueryValid = parameters.includes('lat') && parameters.includes('lon')
    if (!isQueryValid) {
      res.status(404).sendData({ error: 'Bad request for /gps. Check instrucions on ' + mainPageUrl })
      return
    }

    if (!isNumeric(req.query.lat) || !isNumeric(req.query.lon)) {
      res.status(404).sendData({ error: `Parameters lat and lon must be a valid number on ${req.originalUrl}` })
      return
    }
    // ### request is valid from here ###

    const lat = parseFloat(req.query.lat) // ex: 40.153687
    const lon = parseFloat(req.query.lon) // ex: -8.514602
    const isDetails = Boolean(parseInt(req.query.detalhes))

    const point = [lon, lat] // longitude, latitude

    for (const key in regions) {
      const transformedPoint = proj4(regions[key].projection, point)

      const lookupFreguesias = new PolygonLookup(regions[key].geojson)
      const freguesia = lookupFreguesias.search(transformedPoint[0], transformedPoint[1])

      if (freguesia) {
        debug('Found freguesia: ', freguesia)
        const local = {
          freguesia: freguesia.properties.Freguesia,
          concelho: freguesia.properties.Concelho,
          distrito: freguesia.properties.Distrito,
          ilha: freguesia.properties.Ilha
        }

        if (isDetails) {
          // search for details for parishes by código INE
          const numberOfParishes = administrations.parishesDetails.length
          // regex to remove leading zeros
          const codigoine = (freguesia.properties.Dicofre || freguesia.properties.DICOFRE).replace(/^0+/, '')
          for (let i = 0; i < numberOfParishes; i++) {
            if (codigoine === administrations.parishesDetails[i].codigoine.replace(/^0+/, '')) {
              local.detalhesFreguesia = administrations.parishesDetails[i]
              break // found it, break loop
            }
          }

          // search for details for municipalities by name
          const numberOfMunicipalities = administrations.municipalitiesDetails.length
          const concelho = normalizeName(freguesia.properties.Concelho)
          for (let i = 0; i < numberOfMunicipalities; i++) {
            if (concelho === normalizeName(administrations.municipalitiesDetails[i].nome)) {
              local.detalhesMunicipio = administrations.municipalitiesDetails[i]
              break // found it, break loop
            }
          }
        }

        debug(local)

        res.status(200).sendData(
          local,
          { latitude: lat, longitude: lon } // inform user of input in case of text/html
        )
        return
      }
    }

    debug('Results not found')

    res.status(404).sendData({ error: 'Results not found. Coordinates out of scope!' })
  } catch (e) {
    debug('Error on server', e)

    res.status(400).sendData(
      { error: 'Wrong request! Example of good request: /gps?lat=40.153687&lon=-8.514602' }
    )
  }
}
