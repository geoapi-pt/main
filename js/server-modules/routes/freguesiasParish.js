const path = require('path')
const debug = require('debug')('geoptapi:server')
const { normalizeName } = require(path.join(__dirname, '..', '..', 'commonFunctions.js'))

module.exports = {
  fn: routeFn,
  route: '/freguesias?/:parish?'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  // if name is not provided in query, consider parameter from url instead
  // example /freguesia/serzedelo
  if (req.params.parish && !req.query.nome) {
    req.query.nome = req.params.parish
  }

  // no parameters, list of parishes
  const numberOfQueryVars = Object.keys(req.query).length
  if (numberOfQueryVars === 0 || (numberOfQueryVars === 1 && parseInt(req.query.json))) {
    res.status(200).sendData(administrations.listOfParishesNames)
    return
  }

  // ### validate request query ###
  // check if all parameters of request exist in parishesDetails
  const allowableParams = administrations.keysOfParishesDetails.concat('json')
  const invalidParameters = []
  for (const param in req.query) {
    if (!req.query[param] || !allowableParams.includes(param)) {
      invalidParameters.push(param)
    }
  }
  if (invalidParameters.length) {
    res.status(404).sendData({ error: `These parameters are invalid or don't exist for for ${req.path}: ${invalidParameters}` })
    return
  }
  // ### request query is valid from here ###

  const { nome, municipio } = req.query
  let results = [...administrations.parishesDetails]

  if (nome) {
    const parishToFind = normalizeName(nome)
    results = results.filter(parish => {
      const name0 = normalizeName(parish.nome)
      const name1 = normalizeName(parish.nomecompleto)
      const name2 = normalizeName(parish.nomecompleto2)
      const name3 = normalizeName(parish.nomecompleto3)
      return parishToFind === name0 || parishToFind === name1 || parishToFind === name2 || parishToFind === name3
    })
  }

  if (municipio) {
    const municipalityToFind = normalizeName(municipio)
    results = results.filter(
      parish => normalizeName(parish.municipio) === municipalityToFind
    )
  }

  // remaining filters
  const filters = ['codigo', 'nif', 'codigopostal',
    'email', 'telefone', 'fax', 'sitio', 'codigoine']

  for (const filter of filters) {
    if (req.query[filter]) {
      results = results.filter(p => p[filter] === req.query[filter])
    }
  }

  if (results.length > 1) {
    res.status(200).sendData(results, 'Lista de freguesias')
  } else if (results.length === 1) {
    res.status(200).sendData(results[0], { Freguesia: `${results[0].nomecompleto} (${results[0].municipio})` })
  } else {
    res.status(404).sendData({ error: 'Freguesia não encontrada!' })
  }
}
