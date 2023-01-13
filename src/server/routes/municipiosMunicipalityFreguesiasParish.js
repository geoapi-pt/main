const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

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

    if (isResponseJson(req)) {
      res.status(200).sendData({ data: result })
    } else {
      // html/text response
      const dataToShowOnHtml = JSON.parse(JSON.stringify(result)) // deep clone

      if (parishGeojson) {
        delete dataToShowOnHtml.geojson
        dataToShowOnHtml.centros = Object.assign({}, parishGeojson.properties.centros)
      }

      // deals with multiple names
      let names = [];
      ['nome', 'nomecompleto', 'nomecompleto2', 'nomecompleto3'].forEach(el => {
        names.push(dataToShowOnHtml[el])
      })
      names = [...new Set(names)] // remove duplicates
      if (names.length > 1) {
        dataToShowOnHtml.nome_alternativo = names[1]
      }
      delete dataToShowOnHtml.nomecompleto
      delete dataToShowOnHtml.nomecompleto2
      delete dataToShowOnHtml.nomecompleto3

      // information already available in section Censos
      delete dataToShowOnHtml.populacao
      delete dataToShowOnHtml.eleitores2011
      delete dataToShowOnHtml.populacao2011

      res.status(200).sendData({
        data: result,
        input: { Freguesia: `${result.nomecompleto} (<a href="/municipio/${result.municipio.toLowerCase()}">${result.municipio}</a>)` },
        dataToShowOnHtml: dataToShowOnHtml,
        pageTitle: `Dados sobre a Freguesia ${result.nomecompleto} (${result.municipio})`,
        template: 'routes/parish'
      })
    }
  } else {
    res.status(404).sendData({ error: `Freguesia ${parish} do município ${municipality} não encontrada!` })
  }
}
