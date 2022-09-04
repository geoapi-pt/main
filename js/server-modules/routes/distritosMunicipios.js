const debug = require('debug')('server') // run: DEBUG=server npm start

module.exports = route // /^\/distritos?\/municipios?$/

function route (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)
  res.status(200).sendData(
    administrations.listOfDistrictsWithMunicipalities,
    'Lista de distritos com os respetivos municípios'
  )
}
