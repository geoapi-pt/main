const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

module.exports = {
  fn: routeFn,
  route: '/distritos/municipios'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  const _result = administrations.districtsDetails
  const result = JSON.parse(JSON.stringify(_result)) // deep clone

  if (isResponseJson(req)) {
    res.status(200).sendData({ data: result })
  } else {
    const resultHtml = JSON.parse(JSON.stringify(result)) // deep clone

    resultHtml.forEach(distrito => {
      distrito.municipios = distrito.municipios
        .map(el => `<a href="/municipios/${encodeURIComponent(el.toLowerCase())}">${el}</a>`)
    })

    res.status(200).sendData({
      data: resultHtml,
      input: 'Lista de distritos com os respetivos municípios',
      pageTitle: 'Lista de distritos de Portugal com os respetivos municípios'
    })
  }
}
