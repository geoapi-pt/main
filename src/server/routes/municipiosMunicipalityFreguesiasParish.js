const path = require('path')
const debug = require('debug')('geoapipt:server')
const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

module.exports = {
  fn: routeFn,
  route: '/municipios?/:municipality?/freguesias?/:parish?'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  if (!req.params.municipality || !req.params.parish) {
    next()
    return
  }

  const municipality = req.params.municipality
  const parish = req.params.parish

  let results = [...administrations.parishesDetails]

  const parishToFind = normalizeName(parish)
  const municipalityToFind = normalizeName(municipality)

  results = results.filter(parish => {
    const name0 = normalizeName(parish.nome)
    const name1 = normalizeName(parish.nomecompleto)
    const name2 = normalizeName(parish.nomecompleto2)
    const name3 = normalizeName(parish.nomecompleto3)
    return (
      (
        parishToFind === name0 ||
        parishToFind === name1 ||
        parishToFind === name2 ||
        parishToFind === name3
      ) &&
      municipalityToFind === normalizeName(parish.municipio)
    )
  })

  if (results.length === 1) {
    res.status(200).sendData({
      data: results[0],
      input: { Freguesia: `${results[0].nomecompleto} (${results[0].municipio})` },
      pageTitle: `Dados sobre a Freguesia ${results[0].nomecompleto} (${results[0].municipio})`
    })
  } else {
    res.status(404).sendData({ error: `Freguesia ${parish} do município ${municipality} não encontrada!` })
  }
}
