const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const { normalizeName } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'commonFunctions.js'))
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

module.exports = {
  fn: routeFn,
  route: '/distritos?/:district?'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.params, req.headers)

  if (req.params.district === 'municipio' || req.params.district === 'municipios') {
    next()
    return
  }

  // if name is not provided in query, consider parameter from url instead
  // example /distrito/évora
  if (req.params.district && !req.query.nome) {
    req.query.nome = req.params.district
  }

  // ### validate request query ###
  const allowableQueryParams = ['nome', 'json', 'key']

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

  // shows a list of all districts in this case, using route /districts
  if (!req.query.nome) {
    res.redirect('/distritos')
  } else {
    const { nome } = req.query
    let results = [...administrations.districtsDetails]

    if (nome) {
      const districtToFind = normalizeName(nome)
      results = results.filter(res => normalizeName(res.distrito) === districtToFind)
    }

    results = JSON.parse(JSON.stringify(results)) // deep clone

    if (results.length === 1) {
      const result = results[0]

      if (isResponseJson(req)) {
        res.status(200).sendData({ data: result })
      } else {
        // html/text response
        const dataToShowOnHtml = JSON.parse(JSON.stringify(result)) // deep clone

        delete dataToShowOnHtml.geojson
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
}
