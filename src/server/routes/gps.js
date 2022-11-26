const fs = require('fs')
const path = require('path')
const proj4 = require('proj4')
const turf = require('@turf/turf')
const appRoot = require('app-root-path')
const PolygonLookup = require('polygon-lookup')
const debug = require('debug')('geoapipt:routes:gps') // DEBUG=geoapipt:routes:gps npm start

const { correctCase } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

const censosGeojsonDir = path.join(appRoot.path, 'res', 'censos', 'geojson', '2021')
const adminAddressesDir = path.join(appRoot.path, 'res', 'admins-addresses')

module.exports = {
  fn: routeFn,
  route: ['/gps', '/gps/:lat?,:lon?', '/gps/:lat?,:lon?/detalhes']
}

function routeFn (req, res, next, { administrations, regions, gitProjectUrl }) {
  const local = {} // the local data corresponding to the coordinates to send with the response
  let lon, lat,
    isDetails, // boolean activated with route /detalhes
    municipalityIneCode,
    parishIneCode

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

    lat = parseFloat(req.query.lat) // ex: 40.153687
    lon = parseFloat(req.query.lon) // ex: -8.514602
    isDetails = Boolean(parseInt(req.query.detalhes)) || (req.path && req.path.endsWith('/detalhes'))

    const point = [lon, lat] // longitude, latitude

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

        municipalityIneCode = parseInt((freguesia.properties.Dicofre || freguesia.properties.DICOFRE).slice(0, 4))
        parishIneCode = parseInt(freguesia.properties.Dicofre || freguesia.properties.DICOFRE)

        if (isDetails) {
          local.detalhesFreguesia = administrations.parishesDetails
            .find(parish => parseInt(parish.codigoine) === parishIneCode)

          local.detalhesMunicipio = administrations.municipalitiesDetails
            .find(municipality => parseInt(municipality.codigoine) === municipalityIneCode)
        }
        break
      }
    }

    if (!local.freguesia) {
      res.status(404).sendData({ error: 'local não encontrado' })
      return
    }

    // Provide secção and subseção estatística
    // files pattern like BGRI2021_0211.json; BGRI => Base Geográfica de Referenciação de Informação (INE, 2021)
    const geojsonFilePath = path.join(
      censosGeojsonDir,
      `BGRI2021_${municipalityIneCode.toString().padStart(4, '0')}.json`
    )
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

        // now extract info from nearest point/address
        const prop = subSecction.properties
        const addressesFilePath = path.join(
          adminAddressesDir,
          prop.DT,
          prop.CC || prop.MN,
          prop.fr || prop.FR,
          prop.SEC,
          prop.SS + '.json'
        )
        if (fs.existsSync(addressesFilePath)) {
          const addresses = JSON.parse(fs.readFileSync(addressesFilePath)).addresses
          if (Array.isArray(addresses) && addresses.length) {
            const targetPoint = turf.point([lon, lat])
            const points = turf.featureCollection(addresses.map(
              p => turf.point(
                [parseFloat(p.lon), parseFloat(p.lat)],
                { street: p.street, house: p.house, postcode: p.postcode, city: p.city }
              )
            ))
            const nearest = turf.nearestPoint(targetPoint, points)
            if (nearest && nearest.properties) {
              debug('nearest point: ', nearest)
              local.rua = correctCase(nearest.properties.street)
              local.n_porta = nearest.properties.house
              local.CP = nearest.properties.postcode
              local.descr_postal = correctCase(nearest.properties.city)
            }
          }
        }
      }
    }
    sendDataOk({ res, local, lat, lon, isDetails })
  } catch (e) {
    debug('Error on server', e)
    res.status(400).sendData(
      { error: 'Wrong request! Example of good request: /gps/40.153687,-8.514602' }
    )
  }
}

function sendDataOk ({ res, local, lat, lon, isDetails }) {
  // Create an object which will serve as the order template; these keys will be on top
  const objectOrder = {
    ilha: null,
    distrito: null,
    concelho: null,
    freguesia: null,
    'Secção Estatística (INE, BGRI 2021)': null,
    'Subsecção Estatística (INE, BGRI 2021)': null,
    rua: null,
    n_porta: null,
    CP: null,
    descr_postal: null
  }

  local = Object.assign(objectOrder, local)

  res.status(200).sendData({
    data: local,
    input: { latitude: convertDDToDMS(lat), longitude: convertDDToDMS(lon, true) }, // inform user of input in case of text/html
    pageTitle: `Dados correspondentes às coordenadas ${lat}, ${lon}`
  })
}

// convert coordinates from decimal to Degrees Minutes And Seconds
function convertDDToDMS (D, lng) {
  const coord = {
    dir: D < 0 ? (lng ? 'O' : 'S') : lng ? 'E' : 'N',
    deg: 0 | (D < 0 ? (D = -D) : D),
    min: 0 | (((D += 1e-9) % 1) * 60),
    sec: (0 | (((D * 60) % 1) * 6000)) / 100
  }
  return `${coord.deg}° ${coord.min}' ${parseInt(coord.sec)}" ${coord.dir}`
}
