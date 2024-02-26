const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const { normalizeName } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'commonFunctions.js'))
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))
const districtsGeojsonDir = path.join(appRoot.path, '..', 'resources', 'res', 'geojson', 'districts')

module.exports = {
  fn: routeFn,
  route: '/distritos?/:district?/municipios'
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

      const districtGeojsons = JSON.parse(
        fs.readFileSync(
          path.join(districtsGeojsonDir, result.codigoine.toString().padStart(2, '0') + '.json')
        )
      )

      if (districtGeojsons) {
        delete districtGeojsons.freguesias
        result.geojsons = districtGeojsons
      }

      if (isResponseJson(req)) {
        res.status(200).sendData({ data: result })
      } else {
        const distrito = result.distrito
        const dataToShowOnHtml = {}

        const encodeName = (str) => {
          return encodeURIComponent(str.toLowerCase())
        }

        dataToShowOnHtml['Municípios'] = result.municipios
          .map(el => `<a href="/municipio/${encodeName(el.nome)}">${el.nome}</a>`)

        res.status(200).sendData({
          data: result,
          input: { Distrito: `<a href="/distrito/${encodeName(distrito)}">${distrito}</a>` },
          pageTitle: `Lista de Municípios do distrito de ${distrito}`,
          dataToShowOnHtml: dataToShowOnHtml,
          template: 'routes/districtMunicipalities'
        })
      }
    } else {
      res.status(404).sendData({ error: `Distrito ${district} não encontrado!` })
    }
  } else {
    next()
  }
}
