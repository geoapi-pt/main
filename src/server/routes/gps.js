const fs = require('fs')
const path = require('path')
const turf = require('@turf/turf')
const async = require('async')
const appRoot = require('app-root-path')
const PolygonLookup = require('polygon-lookup')

// max distance (in meters) from a point of OpenAddresses file for street to be given
// if that distance exceeds, use Nominatim
const distanceInMetersThreshold = 10

// when coordinate does not lie within the map boundaries, give some margin
// for example for points near the coastal line or near the border
// see https://github.com/jfoclpf/geoapi.pt/issues/34
const distanceInMetersForMapMargins = 100

// modules
const utilsDir = path.join(appRoot.path, 'src', 'server', 'utils')
const servicesDir = path.join(appRoot.path, 'src', 'server', 'services')
const { correctCase, convertPerigoIncendio } = require(path.join(utilsDir, 'commonFunctions.js'))
const isResponseJson = require(path.join(utilsDir, 'isResponseJson.js'))
const getNominatimData = require(path.join(servicesDir, 'getNominatimData.js'))
const getAltitude = require(path.join(servicesDir, 'getAltitude.js'))
const distanceToPolygon = require(path.join(utilsDir, 'distanceToPolygon.js'))

// directories
const censosGeojsonDir = path.join(appRoot.path, '..', 'resources', 'res', 'geojson')
const adminAddressesDir = path.join(appRoot.path, '..', 'resources', 'res', 'admins-addresses')
const cartaSoloDir = path.join(appRoot.path, '..', 'resources', 'res', 'carta-solo', 'freguesias')
const incendioRuralDir = path.join(appRoot.path, '..', 'resources', 'res', 'perigosidade-incendio-rural', 'freguesias')

module.exports = {
  fn: routeFn,
  route: [
    '/gps',
    '/gps/:lat?,:lon?',
    '/gps/:lat?,:lon?/detalhes',
    '/gps/:lat?,:lon?/base',
    '/gps/:lat?,:lon?/base/detalhes'
  ]
}

function routeFn (req, res, next, { administrations, regions, defaultOrigin }) {
  let lon, lat,
    local, // the local data corresponding to the coordinates to send with the response
    isDetails, // boolean activated with route /detalhes or &detalhes=1
    isBase, // boolean activated with route /base or &base=1
    useExternalApis, // boolean set to false when query parameter ext-apis=0 or ext-apis=false
    municipalityIneCode,
    parishIneCode

  try {
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
      res.status(404).sendData({ error: `Bad request for /gps. Check instrucions on ${defaultOrigin}/docs` })
      return
    }

    if (!isNumeric(req.query.lat) || !isNumeric(req.query.lon)) {
      res.status(404).sendData({ error: `Parameters lat and lon must be a valid number on ${req.originalUrl}` })
      return
    }
    // ### request is valid from here ###

    lat = parseFloat(req.query.lat) // ex: 40.153687
    lon = parseFloat(req.query.lon) // ex: -8.514602

    isDetails = Boolean(parseInt(req.query.detalhes)) || (req.path && req.path.includes('/detalhes'))
    isBase = Boolean(parseInt(req.query.base)) || (req.path && req.path.includes('/base'))

    useExternalApis = parseInt(req.query['ext-apis']) !== 0 && req.query['ext-apis'] !== 'false'

    const result = getLocalFromCoord([lon, lat], { regions, administrations, isDetails })
    if (result) {
      local = { lon, lat, ...result.local }
      municipalityIneCode = result.municipalityIneCode
      parishIneCode = result.parishIneCode
    } else {
      // try other points around the point[lon, lat], i.e., provides a margin
      // see https://github.com/jfoclpf/geoapi.pt/issues/34#issuecomment-1470107761
      const geoJsonPoint = turf.point([lon, lat])
      const circleMargin = []
      for (let angle = 0; angle < 360; angle += 45) {
        circleMargin.push(
          turf.transformTranslate(geoJsonPoint, distanceInMetersForMapMargins / 1000, angle).geometry.coordinates
        )
      }

      let found = false
      for (const translatedPoint of circleMargin) {
        const translatedResult = getLocalFromCoord(translatedPoint, { regions, administrations, isDetails })
        if (translatedResult) {
          local = { lon, lat, ...translatedResult.local }

          local.distancia_da_freguesia_m = Math.round(Math.abs(distanceToPolygon({
            point: turf.point(translatedPoint),
            polygon: translatedResult.parishGeoJson
          })))

          municipalityIneCode = translatedResult.municipalityIneCode
          parishIneCode = translatedResult.parishIneCode
          found = true
          break
        }
      }

      if (!found) {
        res.status(404).sendData({ error: 'local não encontrado' })
        return
      }
    }
  } catch (err) {
    console.error(err)
    res.status(400).sendData(
      { error: 'Wrong request! Example of good request: /gps/40.153687,-8.514602' }
    )
  }

  // if isBase is set on the request, just sends distrito, município e freguesia
  if (isBase) {
    sendDataOk({ req, res, local, lat, lon })
    return
  }

  // from here the request is OK and parish was found

  async.parallel([(callback) => {
    // Provides secção and subseção estatística
    // files pattern like BGRI2021_0211.json; BGRI => Base Geográfica de Referenciação de Informação (INE, 2021)
    const geojsonFilePath = path.join(
      censosGeojsonDir, 'subseccoes', '2021',
      `${municipalityIneCode.toString().padStart(4, '0')}.geojson`
    )

    fs.readFile(geojsonFilePath, (err, data) => {
      if (!err && data) {
        const geojsonData = JSON.parse(data)
        const lookupBGRI = new PolygonLookup(geojsonData)
        const subSecction = lookupBGRI.search(lon, lat)

        if (subSecction) {
          const prop = subSecction.properties

          const SEC = prop.SEC || prop.SECNUM21 || prop.DTMNFRSEC21.slice(-3)
          const SS = prop.SS || prop.SSNUM21 || prop.SECSSNUM21.slice(-2) || prop.SUBSECCAO.slice(-2)

          local.SEC = SEC
          local.SS = SS

          if (isDetails) {
            local['Detalhes Subsecção Estatística'] = subSecction.properties
          }

          // now extract info from nearest point/address
          const addressesFilePath = path.join(
            adminAddressesDir,
            prop.DT || prop.DT21,
            prop.CC || prop.MN || prop.DTMN21.slice(-2),
            prop.fr || prop.FR || prop.DTMNFR21.slice(-2),
            SEC,
            SS + '.json'
          )

          fs.readFile(addressesFilePath, (err, data) => {
            if (!err && data) {
              const addresses = JSON.parse(data).addresses
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
                  const distanceInMeters = turf.distance(nearest, targetPoint, { units: 'kilometers' }) * 1000
                  if (distanceInMeters < distanceInMetersThreshold) {
                    local.rua = correctCase(nearest.properties.street)
                    local.n_porta = nearest.properties.house
                    local.CP = nearest.properties.postcode
                    local.descr_postal = correctCase(nearest.properties.city)
                    callback()
                  } else {
                    if (useExternalApis) {
                      getNominatimData({ req, lat, lon, local }, callback)
                    } else {
                      callback()
                    }
                  }
                }
              }
            } else {
              if (useExternalApis) {
                getNominatimData({ req, lat, lon, local }, callback)
              } else {
                callback()
              }
            }
          })
        } else {
          callback()
        }
      } else {
        console.warn('Empty or no data on ' + geojsonFilePath)
        callback()
      }
    })
  }, (callback) => {
    // Carta de Uso e Utilização do Solo
    const cartaSoloGeojsonFile = path.join(
      cartaSoloDir,
      `${parishIneCode.toString().padStart(6, '0')}.json`
    )
    fs.readFile(cartaSoloGeojsonFile, (err, data) => {
      if (!err && data) {
        const geojsonData = JSON.parse(data)
        const lookupBGRI = new PolygonLookup(geojsonData)
        const zone = lookupBGRI.search(lon, lat)
        if (zone) {
          local.uso = zone.properties.COS18n4_L
          if (isDetails) {
            local.carta_solo = zone.properties
          }
        }
      }
      callback()
    })
  }, (callback) => {
    // Perigo de Incêndio (da Carta de Perigosidade de Incêndio Rural)
    const incendioRuralGeojsonFile = path.join(
      incendioRuralDir,
      `${parishIneCode.toString().padStart(6, '0')}.geojson`
    )
    fs.readFile(incendioRuralGeojsonFile, (err, data) => {
      if (!err && data) {
        const geojsonData = JSON.parse(data)
        const lookupBGRI = new PolygonLookup(geojsonData)
        const zone = lookupBGRI.search(lon, lat)
        if (zone) {
          local.perigo_incendio = convertPerigoIncendio(zone.properties.gridcode)
        }
      }
      callback()
    })
  },
  (callback) => {
    getAltitude.get({ lat, lon })
      .then(res => {
        local.altitude_m = res
        callback()
      })
      .catch(err => {
        console.error(err.message)
        callback()
      })
  }], (err) => {
    if (err) {
      console.error(err)
      res.status(500).sendData({ error: 'Internal server error' })
    } else {
      sendDataOk({ req, res, local, lat, lon })
    }
  })
}

function sendDataOk ({ req, res, local, lat, lon }) {
  if (isResponseJson(req)) {
    res.status(200).sendData({ data: local })
  } else {
    // html/text
    const dataToShowOnHtml = JSON.parse(JSON.stringify(local)) // deep clone

    delete dataToShowOnHtml.lat
    delete dataToShowOnHtml.lon

    res.status(200).sendData({
      data: local,
      input: { Latitude: convertDDToDMS(lat), Longitude: convertDDToDMS(lon, true) }, // inform user of input in case of text/html
      dataToShowOnHtml: dataToShowOnHtml,
      pageTitle: `Dados correspondentes às coordenadas ${lat}, ${lon}`,
      template: 'routes/gps'
    })
  }
}

function getLocalFromCoord (point, { regions, administrations, isDetails }) {
  const lon = point[0]
  const lat = point[1]
  let parishGeoJson

  const res = {}
  let municipalityIneCode, parishIneCode

  for (const key in regions) {
    const lookupFreguesias = new PolygonLookup(regions[key].geojson)
    const freguesia = lookupFreguesias.search(lon, lat)

    if (freguesia) {
      parishGeoJson = freguesia

      res.ilha = freguesia.properties.Ilha
      res.distrito = freguesia.properties.Distrito
      res.concelho = freguesia.properties.Concelho
      res.freguesia = freguesia.properties.Freguesia

      municipalityIneCode = parseInt((freguesia.properties.Dicofre || freguesia.properties.DICOFRE).slice(0, 4))
      parishIneCode = parseInt(freguesia.properties.Dicofre || freguesia.properties.DICOFRE)

      if (isDetails) {
        res.detalhesFreguesia = administrations.parishesDetails
          .find(parish => parseInt(parish.codigoine) === parishIneCode)

        res.detalhesMunicipio = administrations.municipalitiesDetails
          .find(municipality => parseInt(municipality.codigoine) === municipalityIneCode)
      }
      break
    }
  }

  if (!res.freguesia) {
    return false
  } else {
    return { local: res, municipalityIneCode, parishIneCode, parishGeoJson }
  }
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
