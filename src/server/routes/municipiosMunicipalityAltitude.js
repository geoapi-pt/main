const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')
const parseGeoraster = require('georaster')
const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

const municipalitiesGeojsonDir = path.join(appRoot.path, '..', 'resources', 'res', 'geojson', 'municipalities')
const municipalitiesGeotiffsDir = path.join(appRoot.path, '..', 'resources', 'res', 'altimetria', 'tif', 'regions', 'municipalities')
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

module.exports = {
  fn: routeFn,
  route: '/municipios?/:municipality?/altimetria'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  if (!req.params.municipality) {
    next()
    return
  }

  const municipality = req.params.municipality

  let results = [...administrations.municipalitiesDetails]

  const municipalityToFind = normalizeName(municipality)
  results = results.filter(
    municipality => normalizeName(municipality.nome) === municipalityToFind
  )

  if (results.length === 1) {
    const result = results[0]

    // in altimetry route delete all data related to censos
    for (const key of Object.keys(result)) {
      if (key.startsWith('censos')) {
        delete result[key]
      }
    }

    const municipalityGeojsons = JSON.parse(
      fs.readFileSync(path.join(municipalitiesGeojsonDir, result.codigoine.padStart(4, '0') + '.json'))
    )

    if (municipalityGeojsons) {
      result.geojson = municipalityGeojsons.municipio
    }

    // get same stats from the geotiff file
    const geotiffFilePath = path.join(municipalitiesGeotiffsDir, `${result.codigoine.padStart(4, 0)}.tif`)
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
              url_geotiff: `${req.protocol}://${req.get('host')}/geotiff/municipalities/${result.codigoine.padStart(4, 0)}.tif`,
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
              input: { Município: `<a href="/municipio/${encodeName(result.nome)}">${result.nome}</a>` },
              dataToShowOnHtml: dataToShowOnHtml,
              pageTitle: `Altimetria do município de ${result.nome}`,
              template: 'routes/municipalityAltitude'
            })
          }
        }).catch(err => {
          console.error(err)
          res.status(404).sendData({ error: `Erro interno ao processar o fiheiro ${geotiffFilePath}!` })
        })
      }
    })
  } else {
    res.status(404).sendData({ error: `Município ${municipality} não encontrado!` })
  }
}
