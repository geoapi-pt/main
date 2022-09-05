const debug = require('debug')('server') // run: DEBUG=server npm start

module.exports = {
  fn: routeFn,
  route: /^\/distritos?$/
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)
  res.status(200).sendData(
    administrations.listOfDistricts,
    'Lista de distritos'
  )
}
