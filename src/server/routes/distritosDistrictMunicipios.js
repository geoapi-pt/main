const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const { normalizeName } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'commonFunctions.js'))
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

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
      const result = results[0] // clone

      if (isResponseJson(req)) {
        res.status(200).sendData({ data: result })
      } else {
        const resultHtml = JSON.parse(JSON.stringify(result)) // deep clone

        resultHtml.municipios = resultHtml.municipios
          .map(el => `<a href="/municipio/${encodeURIComponent(el.toLowerCase())}">${el}</a>`)

        res.status(200).sendData({
          data: resultHtml,
          input: `Lista de Municípios do distrito de ${resultHtml.distrito}`,
          pageTitle: `Lista de Municípios do distrito de ${resultHtml.distrito}`
        })
      }
    } else {
      res.status(404).sendData({ error: `Distrito ${district} não encontrado!` })
    }
  } else {
    next()
  }
}
