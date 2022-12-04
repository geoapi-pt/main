const path = require('path')
const debug = require('debug')('geoapipt:server')
const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

module.exports = {
  fn: routeFn,
  route: '/municipios?/:municipality?/freguesias?/:parish?'
}

function routeFn (req, res, next, { administrations, regions }) {
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
    const result = results[0]

    let parishGeojson
    for (const region in regions) {
      const parishes = regions[region].geojson.features
      parishGeojson = parishes.find(parish =>
        parseInt(parish.properties.DICOFRE || parish.properties.Dicofre) === parseInt(result.codigoine)
      )
      if (parishGeojson) {
        break
      }
    }

    if (parishGeojson) {
      result.geojson = parishGeojson
    }

    const dataToShowOnHtml = Object.assign({}, result) // clone
    if (parishGeojson) {
      delete dataToShowOnHtml.geojson
      dataToShowOnHtml.centros = Object.assign({}, parishGeojson.properties.centros)
    }
    if (dataToShowOnHtml.sitio) {
      const host = dataToShowOnHtml.sitio.replace(/^http?:\/\//, '')
      dataToShowOnHtml.sitio = `<a href="//${host}">${host}</a>`
    }

    // asserts postal code is XXXX, XXXXYYY or XXXX-YYY
    const CP = dataToShowOnHtml.codigopostal
    if (/^\d{4}(\p{Dash}?\d{3})?$/u.test(CP)) {
      dataToShowOnHtml.codigopostal = `<a href="/cp/${CP}">${CP}</a>`
    }
    if (dataToShowOnHtml.municipio) {
      dataToShowOnHtml.municipio = `<a href="/municipios/${dataToShowOnHtml.municipio}">${dataToShowOnHtml.municipio}</a>`
    }

    res.status(200).sendData({
      data: result,
      input: { Freguesia: `${result.nomecompleto} (<a href="/municipios/${result.municipio}">${result.municipio}</a>)` },
      dataToShowOnHtml: dataToShowOnHtml,
      pageTitle: `Dados sobre a Freguesia ${result.nomecompleto} (${result.municipio})`,
      template: 'routes/parish'
    })
  } else {
    res.status(404).sendData({ error: `Freguesia ${parish} do município ${municipality} não encontrada!` })
  }
}
