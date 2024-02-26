const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const turf = require('@turf/turf')
const debug = require('debug')('geoapipt:server')

const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

const geojsonDir = path.join(appRoot.path, '..', 'resources', 'res', 'geojson')

module.exports = {
  fn: routeFn,
  route: '/municipios?/:municipality?/freguesias?/:parish?/sec(co|çõ|%C3%A7%C3%B5)es'
}

async function routeFn (req, res, next, { administrations, regions }) {
  debug(req.path, req.query, req.headers)

  if (!req.params.municipality || !req.params.parish) {
    next()
    return
  }

  const municipality = req.params.municipality
  const parish = req.params.parish

  let parishResults = [...administrations.parishesDetails]

  const parishToFind = normalizeName(parish)
  const municipalityToFind = normalizeName(municipality)

  parishResults = parishResults.filter(parish => {
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

  parishResults = JSON.parse(JSON.stringify(parishResults)) // deep clone

  if (parishResults.length === 1) {
    const parish = parishResults[0]

    const parishCode = parish.codigoine.padStart(6, '0')
    const municipalityCode = parishCode.slice(0, 4)

    const municipality = administrations.municipalitiesDetails
      .find(e => parseInt(e.codigoine) === parseInt(municipalityCode))

    // data to be sent to client
    const sectionsObj = {
      freguesia: parish,
      municipio: municipality
    }

    const geojsonFile = path.join(geojsonDir, 'seccoes', '2021', `${municipalityCode}.geojson`)

    if (!fs.existsSync(geojsonFile)) {
      res.status(404).sendData({ error: `Ficheiro Geojson ${path.relative(appRoot.path, geojsonFile)} não encontrado!` })
      return
    }

    let sectionsGeojson, filteredSectionsGeojson
    // eslint-disable-next-line prefer-const
    sectionsGeojson = filteredSectionsGeojson = JSON.parse(fs.readFileSync(geojsonFile, 'utf-8'))

    filteredSectionsGeojson.features = sectionsGeojson.features
      .filter(el => el.properties.DTMNFR21.padStart(6, '0') === parishCode)

    if (filteredSectionsGeojson.features.length) {
      sectionsObj.geojson = filteredSectionsGeojson
      sectionsObj.geojson.bbox = turf.bbox(filteredSectionsGeojson)
    } else {
      res.status(404).sendData({
        error: `Secções estatísticas não encontradas para a freguesia ${parish.nome} do município ${municipality.nome}!`
      })
      return
    }

    if (isResponseJson(req)) {
      res.status(200).sendData({ data: sectionsObj })
    } else {
      // html/text response
      const dataToShowOnHtml = {}

      dataToShowOnHtml.freguesia = parish.nome
      dataToShowOnHtml.municipio = municipality.nome
      dataToShowOnHtml.distrito = municipality.distrito

      res.status(200).sendData({
        data: sectionsObj,
        input: {
          Freguesia:
            `<a href="/municipio/${encodeURIComponent(parish.municipio.toLowerCase())}/freguesia/${encodeURIComponent(parish.nomecompleto.toLowerCase())}">${parish.nomecompleto}</a> ` +
            `(<a href="/municipio/${parish.municipio.toLowerCase()}">${parish.municipio}</a>)`
        },
        dataToShowOnHtml: dataToShowOnHtml,
        pageTitle: `Secções estatísticas da Freguesia ${parish.nomecompleto} (${parish.municipio})`,
        template: 'routes/parishSections'
      })
    }
  } else {
    res.status(404).sendData({ error: `Secções não encontradas para a freguesia ${parish.nome} do município ${municipality.nome}!` })
  }
}
