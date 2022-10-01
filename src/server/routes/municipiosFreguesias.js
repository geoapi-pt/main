const debug = require('debug')('geoapipt:server')

module.exports = {
  fn: routeFn,
  route: /^\/municipios?\/freguesias?$/
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)
  res.status(200).sendData({
    data: administrations.listOfMunicipalitiesWithParishes,
    input: 'Lista de municípios com as respetivas freguesias',
    pageTitle: 'Lista de municípios de Portugal com as respetivas freguesias',
    typeOfLink: 'parish'
  })
}
