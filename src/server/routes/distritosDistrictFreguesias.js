const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const { normalizeName } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'commonFunctions.js'))
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))
const districtsGeojsonDir = path.join(appRoot.path, '..', 'resources', 'res', 'geojson', 'districts')

module.exports = {
  fn: routeFn,
  route: '/distritos?/:district?/freguesias'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  if (req.params.district) {
    const district = req.params.district

    const _results = administrations.districtsDetails
      .filter(el => normalizeName(el.distrito) === normalizeName(district))
    const results = JSON.parse(JSON.stringify(_results)) // deep clone

    if (results.length === 1) {
      const result = results[0]

      let districtGeojsons
      if (!Array.isArray(result.codigoine)) {
        districtGeojsons = JSON.parse(
          fs.readFileSync(
            path.join(districtsGeojsonDir, result.codigoine.toString().padStart(2, '0') + '.json')
          )
        )
      } else if (Array.isArray(result.codigoine) && result.codigoine.length === 1) {
        districtGeojsons = JSON.parse(
          fs.readFileSync(
            path.join(districtsGeojsonDir, result.codigoine[0].toString().padStart(2, '0') + '.json')
          )
        )
      } else if (Array.isArray(result.codigoine) && result.codigoine.length > 1) {
        // result.codigoine is an Array for Madeira and Azores
        districtGeojsons = {
          freguesias: []
        }
        for (const codigoine of result.codigoine) {
          const geoJSON = JSON.parse(
            fs.readFileSync(
              path.join(districtsGeojsonDir, codigoine.toString().padStart(2, '0') + '.json')
            )
          )
          districtGeojsons.freguesias.push(...geoJSON.freguesias)
        }
      }

      if (districtGeojsons) {
        delete districtGeojsons.municipios

        result.geojsons = districtGeojsons
        // form list of parishes from geojson file, to show on HTML page
        result.freguesias = districtGeojsons.freguesias.map(el => el.properties.Freguesia)
      }

      if (isResponseJson(req)) {
        res.status(200).sendData({ data: result })
      } else {
        const distrito = result.distrito
        const dataToShowOnHtml = {}

        const encodeName = (str) => {
          return encodeURIComponent(str.toLowerCase())
        }

        if (districtGeojsons) {
          // form list of parishes from geojson file, to show on HTML page
          dataToShowOnHtml.freguesias = districtGeojsons.freguesias
            .map(el => {
              const municipality = el.properties.Concelho
              const parish = el.properties.Freguesia
              return `<a href="/municipio/${encodeName(municipality)}/freguesia/${encodeName(parish)}">${parish}</a>`
            })
        }

        res.status(200).sendData({
          data: result,
          input: { Distrito: `<a href="/distrito/${encodeName(distrito)}">${distrito}</a>` },
          pageTitle: `Lista de Freguesias do distrito de ${distrito}`,
          dataToShowOnHtml: dataToShowOnHtml,
          template: 'routes/districtParishes'
        })
      }
    } else {
      res.status(404).sendData({ error: `Distrito ${district} não encontrado!` })
    }
  } else {
    next()
  }
}
