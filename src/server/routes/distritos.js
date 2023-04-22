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

  if (isResponseJson(req)) {
    const result = JSON.parse(JSON.stringify(administrations.districtsDetails)) // deep clone
    // for info about municiaplities of each district use instead route /distritos/municipios
    result.forEach(district => {
      delete district.municipios
    })
    res.status(200).sendData({ data: result })
  } else {
    res.status(200).sendData({
      data: JSON.parse(JSON.stringify(administrations.listOfDistricts)), // deep clone
      input: 'Lista de distritos',
      pageTitle: 'Lista de distritos de Portugal'
    })
  }
}
