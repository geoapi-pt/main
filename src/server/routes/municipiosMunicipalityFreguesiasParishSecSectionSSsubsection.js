const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const turf = require('@turf/turf')
const debug = require('debug')('geoapipt:server')

const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

const geojsonDir = path.join(appRoot.path, 'res', 'geojson')
const subsectionsCensosDir = path.join(appRoot.path, 'res', 'censos', 'data', 'subseccoes')

module.exports = {
  fn: routeFn,
  route: '/municipios?/:municipality?/freguesias?/:parish?/sec/:section?/ss/:subsection?'
}

async function routeFn (req, res, next, { administrations, regions }) {
  debug(req.path, req.query, req.headers)

  if (!req.params.municipality || !req.params.parish || !req.params.section) {
    next()
    return
  }

  const municipality = req.params.municipality
  const parish = req.params.parish
  const section = req.params.section.padStart(3, '0')
  const subsection = req.params.subsection.padStart(2, '0')

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
    const sectionFullCode = parishCode + section
    const subsectionFullCode = sectionFullCode + subsection

    const municipality = administrations.municipalitiesDetails
      .find(e => parseInt(e.codigoine) === parseInt(municipalityCode))

    const subsectionObj = {
      freguesia: parish,
      municipio: municipality
    }

    const geojsonFile = path.join(geojsonDir, 'subseccoes', '2021', `${municipalityCode}.json`)
    const censosFile = path.join(subsectionsCensosDir, parishCode, `${subsectionFullCode}.json`)

    if (!fs.existsSync(geojsonFile)) {
      res.status(404).sendData({ error: `Ficheiro Geojson ${path.relative(appRoot.path, geojsonFile)} não encontrado!` })
      return
    }
    if (!fs.existsSync(censosFile)) {
      res.status(404).sendData({ error: `Ficheiro de Censos ${path.relative(appRoot.path, censosFile)} não encontrado!` })
      return
    }

    const dataFromFiles = await Promise.all([fs.promises.readFile(geojsonFile), fs.promises.readFile(censosFile)])
    const subsectionsGeojson = JSON.parse(dataFromFiles[0])
    const subsectionsCensos = JSON.parse(dataFromFiles[1])

    const subsectionGeojson = subsectionsGeojson.features
      .find(el => el.properties.SUBSECCAO === subsectionFullCode.padStart(11, '0'))

    if (subsectionGeojson) {
      subsectionObj.geojson = subsectionGeojson
      subsectionObj.geojson.bbox = turf.bbox(subsectionGeojson)
    } else {
      res.status(404).sendData({
        error: `Geojson não encontrado para a Subsecção ${subsection} da Secção ${section} da freguesia ${parish.nome} do município ${municipality.nome}!`
      })
      return
    }

    if (subsectionsCensos) {
      for (const key in subsectionsCensos) {
        if (key.startsWith('censos')) {
          subsectionObj[key] = subsectionsCensos[key]
        }
      }
    }

    if (isResponseJson(req)) {
      res.status(200).sendData({ data: sectionObj })
    } else {
      // html/text response
      const dataToShowOnHtml = JSON.parse(JSON.stringify(subsectionObj)) // deep clone

      const freguesia = dataToShowOnHtml.freguesia.nome
      const municipio = dataToShowOnHtml.municipio.nome
      const distrito = dataToShowOnHtml.municipio.distrito

      delete dataToShowOnHtml.freguesia
      delete dataToShowOnHtml.municipio

      dataToShowOnHtml.freguesia = freguesia
      dataToShowOnHtml.municipio = municipio
      dataToShowOnHtml.distrito = distrito
      dataToShowOnHtml.SEC = section

      if (subsectionGeojson) {
        delete dataToShowOnHtml.geojson
      }

      res.status(200).sendData({
        data: subsectionObj,
        input: {
          Subsecção: subsection,
          Secção: `<a href="/municipio/${adaptUrlVar(municipality.nome)}/freguesia/${adaptUrlVar(parish.nome)}/sec/${section}">${section}</a>`,
          Freguesia: `${parish.nomecompleto} (<a href="/municipio/${adaptUrlVar(municipality.nome)}">${municipality.nome}</a>)`
        },
        dataToShowOnHtml: dataToShowOnHtml,
        pageTitle: `Dados sobre a Subsecção Estatística ${subsection} da Secção ${section} da Freguesia ${parish.nomecompleto} (${parish.municipio})`,
        template: 'routes/subseccao'
      })
    }
  } else {
    res.status(404).sendData({ error: `Subsecção ${subsection} da Secção ${section} da freguesia ${parish.nome} do município ${municipality.nome} não encontrada!` })
  }
}

function adaptUrlVar (str) {
  return encodeURIComponent(str.toLowerCase())
}
