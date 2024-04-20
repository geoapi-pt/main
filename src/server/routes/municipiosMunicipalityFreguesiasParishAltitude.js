const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server:route:mmfp')
const parseGeoraster = require('georaster')

const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

const parishesGeotiffsDir = path.join(appRoot.path, '..', 'resources', 'res', 'altimetria', 'tif', 'regions', 'parishes')

module.exports = {
  fn: routeFn,
  route: '/municipios?/:municipality?/freguesias?/:parish?/altimetria'
}

function routeFn (req, res, next, { administrations, regions }) {
  debug(req.path, req.query, req.headers)

  if (!req.params.municipality || !req.params.parish) {
    next()
    return
  }

  const municipality = req.params.municipality
  const parish = req.params.parish
  debug(`municipality: ${municipality}; parish: ${parish}`)

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

  results = JSON.parse(JSON.stringify(results)) // deep clone

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

    const codigoine = result.codigoine.padStart(6, '0')
    const districtCode = codigoine.slice(0, 2)
    const municipalityCode = codigoine.slice(2, 4)
    const parishCode = codigoine.slice(4, 6)

    // get same stats from the geotiff file
    const geotiffFilePath = path.join(parishesGeotiffsDir, districtCode, municipalityCode, parishCode + '.tif')
    fs.readFile(geotiffFilePath, (err, data) => {
      if (err) {
        console.error(err)
        res.status(404).sendData({ error: `Erro interno ao abrir o fiheiro ${geotiffFilePath}!` })
      } else {
        parseGeoraster(data).then(georaster => {
          const altitude_maxima = Math.round(georaster.maxs[0]) // eslint-disable-line camelcase
          const altitude_minima = georaster.mins[0] < 0 ? 0 : Math.round(georaster.mins[0]) // eslint-disable-line camelcase
          const diferencial_de_altitude = altitude_maxima - altitude_minima // eslint-disable-line camelcase

          if (isResponseJson(req)) {
            result.altitude = {
              url_geotiff: `${req.protocol}://${req.get('host')}/geotiff/parishes/${districtCode}/${municipalityCode}/${parishCode}.tif`,
              altitude_maxima,
              altitude_minima,
              diferencial_de_altitude
            }
            res.status(200).sendData({ data: result })
          } else {
            // html/text response
            const dataToShowOnHtml = {
              altitude_maxima,
              altitude_minima,
              diferencial_de_altitude
            }
            const encodeName = (str) => {
              return encodeURIComponent(str.toLowerCase())
            }

            res.status(200).sendData({
              data: result,
              input: { Município: `<a href="/municipio/${encodeName(result.nome)}/altitude">${result.nome}</a>` },
              dataToShowOnHtml: dataToShowOnHtml,
              pageTitle: `Altimetria da freguesia ${result.nome}`,
              template: 'routes/parishAltitude'
            })
          }
        }).catch(err => {
          console.error(err)
          res.status(404).sendData({ error: `Erro interno ao processar o fiheiro ${geotiffFilePath}!` })
        })
      }
    })
  } else {
    res.status(404).sendData({ error: `Freguesia ${parish} do município ${municipality} não encontrada!` })
  }
}
