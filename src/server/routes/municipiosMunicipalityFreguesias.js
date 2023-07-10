const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')
const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

const municipalitiesGeojsonDir = path.join(appRoot.path, 'res', 'geojson', 'municipalities')
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

module.exports = {
  fn: routeFn,
  route: '/municipios?/:municipality?/freguesias'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  if (!req.params.municipality) {
    next()
    return
  }

  const municipality = req.params.municipality

  const _results = administrations.listOfMunicipalitiesWithParishes
    .filter(el => normalizeName(el.nome) === normalizeName(municipality))
  const results = JSON.parse(JSON.stringify(_results)) // deep clone

  if (results.length > 1) {
    res.status(200).sendData({ data: results, input: 'Lista de freguesias para municípios escolhidos' })
  } else if (results.length === 1) {
    const result = results[0]

    const municipalityToFind = normalizeName(municipality)
    const municipalityDetails = [...administrations.municipalitiesDetails].filter(
      municipality => normalizeName(municipality.nome) === municipalityToFind
    )

    let municipalityGeojsons
    if (municipalityDetails && municipalityDetails.length === 1) {
      municipalityGeojsons = JSON.parse(
        fs.readFileSync(
          path.join(municipalitiesGeojsonDir, municipalityDetails[0].codigoine.padStart(4, '0') + '.json')
        )
      )

      if (municipalityGeojsons) {
        result.geojsons = municipalityGeojsons
      }
    }

    if (isResponseJson(req)) {
      res.status(200).sendData({ data: result })
    } else {
      // html/text response
      const dataToShowOnHtml = JSON.parse(JSON.stringify(result)) // deep clone

      if (municipalityGeojsons) {
        delete dataToShowOnHtml.geojsons
      }

      const encodeName = (str) => {
        return encodeURIComponent(str.toLowerCase())
      }

      dataToShowOnHtml.Freguesias = dataToShowOnHtml.freguesias.map(el =>
        `<a href="/municipio/${encodeName(dataToShowOnHtml.nome)}/freguesia/${encodeName(el)}">${el}</a>`
      )

      delete dataToShowOnHtml.freguesias

      // no need for html, since it is already in input key
      delete dataToShowOnHtml.nome

      res.status(200).sendData({
        data: result,
        input: { Município: `<a href="/municipio/${encodeName(result.nome)}">${result.nome}</a>` },
        dataToShowOnHtml: dataToShowOnHtml,
        pageTitle: `Lista de freguesias do município de ${result.nome}`,
        template: 'routes/municipalityParishes'
      })
    }
  } else {
    res.status(404).sendData({ error: `Município ${municipality} não encontrado!` })
  }
}
