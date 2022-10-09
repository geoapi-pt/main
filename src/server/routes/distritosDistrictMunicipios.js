const path = require('path')
const debug = require('debug')('geoapipt:server')
const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

module.exports = {
  fn: routeFn,
  route: '/distritos/:district?/municipios'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  if (req.params.district) {
    const district = req.params.district

    const result = administrations.listOfDistrictsWithMunicipalities
      .filter(el => normalizeName(el.distrito) === normalizeName(district))

    if (result.length === 1) {
      res.status(200).sendData({
        data: result[0],
        typeOfLink: 'municipality',
        input: `Lista de Municípios do distrito do ${district}`,
        pageTitle: `Lista de Municípios do distrito do ${district}`
      })
    } else {
      res.status(404).sendData({ error: `Distrito ${district} não encontrado!` })
    }
  } else {
    next()
  }
}
