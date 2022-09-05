const path = require('path')
const debug = require('debug')('geoptapi:server')
const { normalizeName } = require(path.join(__dirname, '..', '..', 'commonFunctions.js'))

module.exports = {
  fn: routeFn,
  route: '/munic(i|í)pios?/:municipality?/freguesias'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  if (!req.params.municipality) {
    next()
    return
  }

  const municipality = req.params.municipality

  const results = administrations.listOfMunicipalitiesWithParishes
    .filter(el => normalizeName(el.nome) === normalizeName(municipality))

  if (results.length > 1) {
    res.status(200).sendData(results, 'Lista de freguesias para municípios escolhidos')
  } else if (results.length === 1) {
    res.status(200).sendData(results[0], { Município: results[0].nome })
  } else {
    res.status(404).sendData({ error: `Município ${municipality} não encontrado!` })
  }
}
