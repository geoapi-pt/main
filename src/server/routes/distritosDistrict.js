const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const { normalizeName } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'commonFunctions.js'))
const districtsGeojsonDir = path.join(appRoot.path, 'res', 'geojson', 'districts')
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

module.exports = {
  fn: routeFn,
  route: '/distritos?/:district?'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  if (req.params.district === 'municipio' || req.params.district === 'municipios') {
    next()
    return
  }

  // if name is not provided in query, consider parameter from url instead
  // example /distrito/évora
  if (req.params.district && !req.query.nome) {
    req.query.nome = req.params.district
  }

  const numberOfQueryVars = Object.keys(req.query).length

  // shows a list of all districts in this case, using route /districts
  if (numberOfQueryVars === 0 || (numberOfQueryVars === 1 && parseInt(req.query.json))) {
    res.redirect('/distritos')
    return
  }

  // ### request query is valid from here ###

  const { nome } = req.query
  let results = [...administrations.districtsDetails]

  if (nome) {
    const districtToFind = normalizeName(nome)
    results = results.filter(res => normalizeName(res.distrito) === districtToFind)
  }

  results = JSON.parse(JSON.stringify(results)) // deep clone

  if (results.length === 1) {
    const result = results[0]
    const districtGeojsons = JSON.parse(
      fs.readFileSync(path.join(districtsGeojsonDir, result.codigoine.padStart(2, '0') + '.json'))
    )

    if (districtGeojsons) {
      result.geojsons = districtGeojsons
    }

    if (isResponseJson(req)) {
      res.status(200).sendData({ data: result })
    } else {
      // html/text response
      const dataToShowOnHtml = JSON.parse(JSON.stringify(result)) // deep clone

      // no need to show geojsons on html page
      if (districtGeojsons) {
        // result Object is sent to html client for map drawing, strip out uneeded info
        delete result.geojsons.municipios
        delete result.geojsons.freguesias

        delete dataToShowOnHtml.geojsons
        dataToShowOnHtml.centros = Object.assign({}, districtGeojsons.distrito.properties.centros)
      }

      delete dataToShowOnHtml.municipios
      delete dataToShowOnHtml.distrito

      const encodeName = (str) => {
        return encodeURIComponent(str.toLowerCase())
      }

      res.status(200).sendData({
        data: result,
        input: {
          Distrito: `${result.distrito} (` +
            `<a href="/distrito/${encodeName(result.distrito)}/municipios">Municípios</a>, ` +
            `<a href="/distrito/${encodeName(result.distrito)}/freguesias">Freguesias</a>` +
            ')'
        },
        dataToShowOnHtml: dataToShowOnHtml,
        pageTitle: `Dados sobre o Distrito de ${result.distrito}`,
        template: 'routes/district'
      })
    }
  } else {
    res.status(404).sendData({ error: 'Distrito não encontrado!' })
  }
}
