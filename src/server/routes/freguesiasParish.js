const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server:freguesiasParish')

const { normalizeName } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'commonFunctions.js'))
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

module.exports = {
  fn: routeFn,
  route: '/freguesias?/:parish?'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  // if name is not provided in query, consider parameter from url instead
  // example /freguesias/serzedelo
  if (req.params.parish && !req.query.nome) {
    req.query.nome = req.params.parish
  }

  // ### validate request query ###
  // check if all parameters of request exist in parishesDetails
  const keysOfParishesDetails = administrations.keysOfParishesDetails
  const allowableQueryParams = keysOfParishesDetails.concat('json', 'key', 'mapa')

  const invalidParameters = []
  for (const param in req.query) {
    if (!req.query[param] || !allowableQueryParams.includes(param)) {
      invalidParameters.push(param)
    }
  }
  if (invalidParameters.length) {
    res.status(404).sendData({ error: `These parameters are invalid or don't exist for for ${req.path}: ${invalidParameters}` })
    return
  }
  // ### request query is valid from here ###

  const arrayOfQueryParam = Object.keys(req.query)

  if (
    !arrayOfQueryParam.some(par => keysOfParishesDetails.includes(par))
  ) {
    // No parameters, responds with a list of parishes
    const result = administrations.listOfParishesNames
    if (isResponseJson(req)) {
      res.status(200).sendData({ data: result })
    } else {
      let resultHtml = JSON.parse(JSON.stringify(result)) // deep clone

      const encodeName = (str) => {
        return encodeURIComponent(str.toLowerCase())
      }

      resultHtml = resultHtml.map(el => {
        // ex: el === 'Abade de Neiva (Barcelos)'
        const parish = el.replace(/\(.*\)/, '').trim()
        const municipalityMatch = el.match(/.+\((.+)\)/)
        if (municipalityMatch && municipalityMatch[1]) {
          return `<a href="/municipio/${encodeName(municipalityMatch[1])}/freguesia/${encodeName(parish)}">${el}</a>`
        } else {
          return `<a href="/freguesia/${encodeName(parish)}">${el}</a>`
        }
      })

      res.status(200).sendData({
        data: resultHtml,
        pageTitle: 'Lista de freguesias de Portugal',
        template: 'routes/parishes'
      })
    }
  } else {
    // search parish first by name and municipality, and then by other fields (nif, codigopostal, etc.)
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

    // remaining filters: ['codigo', 'nif', 'codigopostal'...] except 'nome'
    // remove 'nome' and 'municipio' from keysOfParishesDetails
    const filters = keysOfParishesDetails.filter(par => !['nome', 'municipio'].includes(par))
    debug(filters)
    for (const filter of filters) {
      if (req.query[filter]) {
        results = results.filter(p => p[filter] == req.query[filter]) // eslint-disable-line eqeqeq
      }
    }

    if (results.length > 1) {
      res.status(200).sendData({
        data: results,
        input: 'Lista de freguesias',
        pageTitle: `Dados sobre freguesias: ${results.map(e => `${e.nomecompleto} (${e.municipio})`).join(', ')}`
      })
    } else if (results.length === 1) {
      const result = results[0]

      if (isResponseJson(req)) {
        res.status(200).sendData({ data: result })
      } else {
        res.status(200).sendData({
          data: result,
          input: { Freguesia: `${result.nomecompleto} (${result.municipio})` },
          pageTitle: `Dados sobre a Freguesia ${result.nomecompleto} (${result.municipio})`
        })
      }
    } else {
      res.status(404).sendData({ error: 'Freguesia não encontrada!' })
    }
  }
}
