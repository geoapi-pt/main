const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')
const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

const municipalitiesGeojsonDir = path.join(appRoot.path, 'res', 'municipalities-geojson')

module.exports = {
  fn: routeFn,
  route: '/municipios?/:municipality?'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  if (req.params.municipality === 'freguesia' || req.params.municipality === 'freguesias') {
    next()
    return
  }

  // if name is not provided in query, consider parameter from url instead
  // example /municipios/évora
  if (req.params.municipality && !req.query.nome) {
    req.query.nome = req.params.municipality
  }

  const numberOfQueryVars = Object.keys(req.query).length
  if (numberOfQueryVars === 0 || (numberOfQueryVars === 1 && parseInt(req.query.json))) {
    res.status(200).sendData({
      data: administrations.listOfMunicipalitiesNames,
      input: 'Lista de todos os municípios',
      pageTitle: 'Lista dos municípios de Portugal',
      typeOfLink: 'municipality'
    })
    return
  }

  // ### validate request query ###
  // check if all parameters of request exist in municipalitiesDetails
  const allowableParams = administrations.keysOfMunicipalitiesDetails.concat('json')
  const invalidParameters = []
  for (const param in req.query) {
    if (!req.query[param] || !allowableParams.includes(param)) {
      invalidParameters.push(param)
    }
  }
  if (invalidParameters.length) {
    res.status(404).sendData({ error: `These parameters are invalid or don't exist for ${req.path}: ${invalidParameters}` })
    return
  }
  // ### request query is valid from here ###

  const { nome } = req.query
  let results = [...administrations.municipalitiesDetails]

  if (nome) {
    const municipalityToFind = normalizeName(nome)
    results = results.filter(
      municipality => normalizeName(municipality.nome) === municipalityToFind
    )
  }

  // remaining filters
  const filters = ['codigo', 'nif', 'codigopostal',
    'email', 'telefone', 'fax', 'sitio', 'codigoine']

  for (const filter of filters) {
    if (req.query[filter]) {
      results = results.filter(p => p[filter] == req.query[filter]) // eslint-disable-line eqeqeq
    }
  }

  if (results.length > 1) {
    res.status(200).sendData({
      data: results,
      input: 'Lista de municípios',
      pageTitle: `Dados sobre municípios: ${results.map(e => `${e.nome}`).join(', ')}`
    })
  } else if (results.length === 1) {
    const result = results[0]
    const municipalityGeojsons = JSON.parse(
      fs.readFileSync(path.join(municipalitiesGeojsonDir, result.codigoine.padStart(4, '0') + '.json'))
    )

    if (municipalityGeojsons) {
      result.geojsons = municipalityGeojsons
    }

    const dataToShowOnHtml = Object.assign({}, result) // clone
    if (municipalityGeojsons) {
      delete dataToShowOnHtml.geojsons
      dataToShowOnHtml.centros = Object.assign({}, municipalityGeojsons.municipio.properties.centros)
    }
    if (dataToShowOnHtml.sitio) {
      const host = dataToShowOnHtml.sitio.replace(/^http?:\/\//, '')
      dataToShowOnHtml.sitio = `<a href="//${host}">${host}</a>`
    }

    res.status(200).sendData({
      data: result,
      input: {
        Município: `${result.nome} (<a href="/municipios/${nome}/freguesias">Freguesias</a>)`
      },
      dataToShowOnHtml: dataToShowOnHtml,
      pageTitle: `Dados sobre o Município de ${results[0].nome}`,
      template: 'routes/municipality'
    })
  } else {
    res.status(404).sendData({ error: 'Município não encontrado!' })
  }
}
