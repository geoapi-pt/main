const debug = require('debug')('server') // run: DEBUG=server npm start

module.exports = route // /^\/municipios?\/freguesias?$/

function route (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)
  res.status(200).sendData(
    administrations.listOfMunicipalitiesWithParishes,
    'Lista de municípios com as respetivas freguesias'
  )
}
