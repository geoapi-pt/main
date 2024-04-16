const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')
const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

const municipalitiesGeojsonDir = path.join(appRoot.path, '..', 'resources', 'res', 'geojson', 'municipalities')
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

module.exports = {
  fn: routeFn,
  route: [
    '/municipios?/:municipality?/altitude',
    '/municipios?/:municipality?/hipsometria'
  ]
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  if (!req.params.municipality) {
    next()
    return
  }

  const municipality = req.params.municipality

  let results = [...administrations.municipalitiesDetails]

  const municipalityToFind = normalizeName(municipality)
  results = results.filter(
    municipality => normalizeName(municipality.nome) === municipalityToFind
  )

  if (results.length === 1) {
    const result = results[0]
    const municipalityGeojsons = JSON.parse(
      fs.readFileSync(path.join(municipalitiesGeojsonDir, result.codigoine.padStart(4, '0') + '.json'))
    )

    if (municipalityGeojsons) {
      result.geojsons = municipalityGeojsons
    }

    if (isResponseJson(req)) {
      res.status(200).sendData({ data: result })
    } else {
      // html/text response
      const encodeName = (str) => {
        return encodeURIComponent(str.toLowerCase())
      }

      res.status(200).sendData({
        data: result,
        input: { Município: `<a href="/municipio/${encodeName(result.nome)}">${result.nome}</a>` },
        pageTitle: `Hipsometria do município de ${result.nome}`,
        template: 'routes/municipalityAltitude'
      })
    }
  } else {
    res.status(404).sendData({ error: `Município ${municipality} não encontrado!` })
  }
}
