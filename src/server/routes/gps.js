const fs = require('fs')
const path = require('path')
const got = require('got')
const proj4 = require('proj4')
const appRoot = require('app-root-path')
const PolygonLookup = require('polygon-lookup')
const debug = require('debug')('geoapipt:routes:gps')
const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

const censosGeojsonDir = path.join(appRoot.path, 'res', 'censos', 'geojson', '2021')
const nominatimReverseBaseUrl = 'https://nominatim.openstreetmap.org/reverse'

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

    let municipalityIneCode // code extracted regions Object, to detect the Census INE BGRI file to use

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
        }

        // search for details for municipalities by name
        const numberOfMunicipalities = administrations.municipalitiesDetails.length
        const municipality = normalizeName(freguesia.properties.Concelho)
        for (let i = 0; i < numberOfMunicipalities; i++) {
          if (municipality === normalizeName(administrations.municipalitiesDetails[i].nome)) {
            if (isDetails) {
              local.detalhesMunicipio = administrations.municipalitiesDetails[i]
            }
            municipalityIneCode = administrations.municipalitiesDetails[i].codigoine
            break // found it, break loop
          }
        }

        break
      }
    }

    if (!local.freguesia) {
      res.status(404).sendData({ error: 'local não encontrado' })
      return
    }

    if (municipalityIneCode) {
      // files pattern like BGRI2021_0211.json
      // BGRI => Base Geográfica de Referenciação de Informação (INE, 2021)
      const file = `BGRI2021_${municipalityIneCode.toString().padStart(4, '0')}.json`
      const geojsonFilePath = path.join(censosGeojsonDir, file)
      if (fs.existsSync(geojsonFilePath)) {
        const geojsonData = JSON.parse(fs.readFileSync(geojsonFilePath))
        const lookupBGRI = new PolygonLookup(geojsonData)
        const subSecction = lookupBGRI.search(lon, lat)
        if (subSecction) {
          debug('Found subSecction: ', subSecction)
          local['Secção Estatística (INE, BGRI 2021)'] = subSecction.properties.SEC
          local['Subsecção Estatística (INE, BGRI 2021)'] = subSecction.properties.SS

          if (isDetails) {
            local['Detalhes Subsecção Estatística'] = subSecction.properties
          }
        }
      }
    }

    // Nominatim usage policy demands a referer
    const referer = `${req.get('origin') || ''}/gps/${lat},${lon}`
    debug('Referer: ', referer)

    got(`${nominatimReverseBaseUrl}?lat=${lat}&lon=${lon}&format=json`,
      { headers: { Referer: referer } })
      .json()
      .then(result => {
        local.morada_completa = result.display_name
        if (result.address) {
          const address = result.address
          local.n_porta = address.house_number
          local.rua = address.road
          local.bairro = address.neighbourhood
          local.zona = address.suburb
          local.CP7 = address.postcode
        }
        sendDataOk({ res, local, lat, lon })
      })
      .catch((err) => {
        if (err) {
          console.error('Open Street Map Nominatim service unavailable', err)
        }
        sendDataOk({ res, local, lat, lon })
      })
  } catch (e) {
    debug('Error on server', e)

    res.status(400).sendData(
      { error: 'Wrong request! Example of good request: /gps/40.153687,-8.514602' }
    )
  }
}

function sendDataOk ({ res, local, lat, lon }) {
  // Create an object which will serve as the order template; these keys will be on top
  const objectOrder = {
    ilha: null,
    distrito: null,
    concelho: null,
    freguesia: null,
    'Secção Estatística (INE, BGRI 2021)': null,
    'Subsecção Estatística (INE, BGRI 2021)': null,
    morada_completa: null,
    zona: null,
    bairro: null,
    rua: null,
    n_porta: null,
    CP7: null
  }
  local = Object.assign(objectOrder, local)

  res.status(200).sendData({
    data: local,
    input: { latitude: lat, longitude: lon }, // inform user of input in case of text/html
    pageTitle: `Freguesia correspondente às coordenadas ${lat}, ${lon}`
  })
}
