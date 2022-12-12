const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

module.exports = {
  fn: routeFn,
  route: '/distritos'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  const result = administrations.listOfDistricts

  if (isResponseJson(req)) {
    res.status(200).sendData({ data: result })
  } else {
    res.status(200).sendData({
      data: result,
      input: 'Lista de distritos',
      pageTitle: 'Lista de distritos de Portugal'
    })
  }
}
