const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

module.exports = {
  fn: routeFn,
  route: '/municipios/freguesias'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  // deep clone
  const result = JSON.parse(JSON.stringify(administrations.listOfMunicipalitiesWithParishes))

  if (isResponseJson(req)) {
    res.status(200).sendData({ data: result })
  } else {
    let resultHtml = result

    const encodeName = (str) => {
      return encodeURIComponent(str.toLowerCase())
    }

    resultHtml = resultHtml.map(municipality => {
      return {
        Município: `<a href="/municipio/${encodeName(municipality.nome)}">${municipality.nome}</a>`,
        freguesias: municipality.freguesias
          .map(el => `<a href="/municipio/${encodeName(municipality.nome)}/freguesia/${encodeName(el)}">${el}</a>`)
      }
    })

    res.status(200).sendData({
      data: resultHtml,
      input: 'Lista de municípios com as respetivas freguesias',
      pageTitle: 'Lista de municípios de Portugal com as respetivas freguesias'
    })
  }
}
