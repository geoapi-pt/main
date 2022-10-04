const debug = require('debug')('geoapipt:server')

module.exports = {
  fn: routeFn,
  route: '/distritos/municipios'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)
  res.status(200).sendData({
    data: administrations.listOfDistrictsWithMunicipalities,
    typeOfLink: 'municipality',
    input: 'Lista de distritos com os respetivos municípios',
    pageTitle: 'Lista de distritos de Portugal com os respetivos municípios'
  })
}
