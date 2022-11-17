const fs = require('fs')
const path = require('path')
const proj4 = require('proj4')
const Piscina = require('piscina')
const appRoot = require('app-root-path')
const PolygonLookup = require('polygon-lookup')
const debug = require('debug')('geoapipt:routes:gps')
const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

const censosGeojsonDir = path.join(appRoot.path, 'res', 'censos', 'geojson', '2021')

const piscina = new Piscina({
  filename: path.resolve(__dirname, '..', 'utils', 'gpsRouteWorker.js')
})

module.exports = {
  fn: routeFn,
  route: ['/gps', '/gps/:lat?,:lon?', '/gps/:lat?,:lon?/detalhes']
}

function routeFn (req, res, next, { administrations, regions, gitProjectUrl }) {
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
      res.status(404).sendData({ error: 'Bad request for /gps. Check instrucions on ' + gitProjectUrl })
      return
    }

    if (!isNumeric(req.query.lat) || !isNumeric(req.query.lon)) {
      res.status(404).sendData({ error: `Parameters lat and lon must be a valid number on ${req.originalUrl}` })
      return
    }
    // ### request is valid from here ###

    const lat = parseFloat(req.query.lat) // ex: 40.153687
    const lon = parseFloat(req.query.lon) // ex: -8.514602
    const isDetails = Boolean(parseInt(req.query.detalhes)) || req.originalUrl.includes('/detalhes')

    const point = [lon, lat] // longitude, latitude
    const local = {} // the local data corresponding to the coordinates

    for (const key in regions) {
      const transformedPoint = proj4(regions[key].projection, point)

      const lookupFreguesias = new PolygonLookup(regions[key].geojson)
      const freguesia = lookupFreguesias.search(transformedPoint[0], transformedPoint[1])

      if (freguesia) {
        debug('Found freguesia: ', freguesia)
        local.ilha = freguesia.properties.Ilha
        local.distrito = freguesia.properties.Distrito
        local.concelho = freguesia.properties.Concelho
        local.freguesia = freguesia.properties.Freguesia

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
          const municipality = normalizeName(freguesia.properties.Concelho)
          for (let i = 0; i < numberOfMunicipalities; i++) {
            if (municipality === normalizeName(administrations.municipalitiesDetails[i].nome)) {
              local.detalhesMunicipio = administrations.municipalitiesDetails[i]
              break // found it, break loop
            }
          }
        }

        break
      }
    }

    if (!local.freguesia) {
      res.status(404).sendData({ error: 'local não encontrado' })
      return
    }

    if (isDetails) {
      // Fetch section and subsection from INE BGRI.
      // This approach is more efficient than async, because PolygonLookup and search is very CPU intensive.
      // Async would run PolygonLookup and respective search to ALL files in parallel, being too low;
      // statistically this approach is more efficient since it breaks the for loop when it finds the result
      const files = fs.readdirSync(censosGeojsonDir)
      for (const _file of files) {
        (async (file) => {
          const geojsonFilePath = path.join(censosGeojsonDir, file)
          const subSecction = await piscina.run({ geojsonFilePath, lat, lon })
          if (subSecction) {
            debug('Found subSecction: ', subSecction)
            local.INE_BGRI_2021 = subSecction.properties

            res.status(200).sendData({
              data: local,
              input: { latitude: lat, longitude: lon }, // inform user of input in case of text/html
              pageTitle: `Freguesia correspondente às coordenadas ${lat}, ${lon}`
            })
          }
        })(_file)
      }
    } else {
      res.status(200).sendData({
        data: local,
        input: { latitude: lat, longitude: lon }, // inform user of input in case of text/html
        pageTitle: `Freguesia correspondente às coordenadas ${lat}, ${lon}`
      })
    }
  } catch (e) {
    debug('Error on server', e)

    res.status(400).sendData(
      { error: 'Wrong request! Example of good request: /gps/40.153687,-8.514602' }
    )
  }
}
