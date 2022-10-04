const path = require('path')
const debug = require('debug')('geoapipt:server')
const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

module.exports = {
  fn: routeFn,
  route: '/municipios/:municipality?/freguesias'
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
    res.status(200).sendData({ data: results, input: 'Lista de freguesias para municípios escolhidos' })
  } else if (results.length === 1) {
    res.status(200).sendData({
      data: results[0],
      input: { Município: results[0].nome },
      pageTitle: `Lista de freguesias do município de ${results[0].nome}`,
      typeOfLink: 'parish'
    })
  } else {
    res.status(404).sendData({ error: `Município ${municipality} não encontrado!` })
  }
}
