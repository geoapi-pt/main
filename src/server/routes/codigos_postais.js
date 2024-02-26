const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))
const postalCodesResDir = path.join(appRoot.path, '..', 'resources', 'res', 'postal-codes')

module.exports = {
  fn: routeFn,
  route: [
    '/codigos_postais',
    '/codigos_postais/base'
  ]
}

// route for Postal Codes: /codigo_postal/XXXX, /codigo_postal/XXXXYYY or /codigo_postal/XXXX-YYY
function routeFn (req, res, next, { appRootPath }) {
  debug(req.path, req.query, req.headers)

  const isBase = Boolean(parseInt(req.query.base)) || (req.path && req.path.endsWith('/base'))

  let data
  if (isBase) {
    data = JSON.parse(fs.readFileSync(path.join(postalCodesResDir, 'baseIndex.json')))
  } else {
    data = JSON.parse(fs.readFileSync(path.join(postalCodesResDir, 'index.json')))
  }

  if (isResponseJson(req)) {
    res.status(200).sendData({ data: data })
  } else {
    // text/html
    // filtered and processed data for presentation
    let dataHtml
    if (isBase) {
      // when isBase is true, data is [1000-000, ..., 9999-999]
      dataHtml = data.map(pc => `<a href="/codigo_postal/${pc}">${pc}</a>`)
    } else {
      /* in this case data is:
      {
        1000: { 000: {}, ..., 999: {} }
        ...,
        9999: { 000: {}, ..., 999: {} }
      } */
      dataHtml = {}
      for (const cp4 in data) {
        const cp4WithLink = `<a href="/codigo_postal/${cp4}">${cp4}</a>`
        dataHtml[cp4WithLink] = {}
        for (const cp3 in data[cp4]) {
          const cp7 = cp4 + '-' + cp3
          dataHtml[cp4WithLink][`<a href="/codigo_postal/${cp7}">${cp7}</a>`] = ''
        }
      }
    }
    res.status(200).sendData({
      data: dataHtml,
      pageTitle: 'Lista de códigos postais'
    })
  }
}
