const debug = require('debug')('geoapipt:server')

module.exports = {
  fn: routeFn,
  route: /^\/distritos?\/municipios?$/
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)
  res.status(200).sendData({
    data: administrations.listOfDistrictsWithMunicipalities,
    input: 'Lista de distritos com os respetivos municípios'
  })
}
