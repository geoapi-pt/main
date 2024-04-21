const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const parseGeoraster = require('georaster')
const debug = require('debug')('geoapipt:server')

const { normalizeName } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'commonFunctions.js'))
const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

const districtsGeotiffsDir = path.join(appRoot.path, '..', 'resources', 'res', 'altimetria', 'tif', 'regions', 'districts')

module.exports = {
  fn: routeFn,
  route: '/distritos?/:district?/altimetria'
}

function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.params, req.headers)

  if (req.params.district === 'municipio' || req.params.district === 'municipios') {
    next()
    return
  }

  // if name is not provided in query, consider parameter from url instead
  // example /distrito/évora
  if (req.params.district && !req.query.nome) {
    req.query.nome = req.params.district
  }

  // ### validate request query ###
  const allowableQueryParams = ['nome', 'json', 'key']

  const invalidParameters = []
  for (const param in req.query) {
    if (!req.query[param] || !allowableQueryParams.includes(param)) {
      invalidParameters.push(param)
    }
  }
  if (invalidParameters.length) {
    res.status(404).sendData({ error: `These parameters are invalid or don't exist for for ${req.path}: ${invalidParameters}` })
    return
  }
  // ### request query is valid from here ###

  // shows a list of all districts in this case, using route /districts
  if (!req.query.nome) {
    res.redirect('/distritos')
  } else {
    const { nome } = req.query
    let results = [...administrations.districtsDetails]

    if (nome) {
      const districtToFind = normalizeName(nome)
      results = results.filter(res => normalizeName(res.distrito) === districtToFind)
    }

    results = JSON.parse(JSON.stringify(results)) // deep clone

    if (results.length === 1) {
      const result = results[0]

      // get same stats from the geotiff file
      const geotiffFilePath = path.join(districtsGeotiffsDir, `${result.codigoine.padStart(2, 0)}.tif`)
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
                url_geotiff: `${req.protocol}://${req.get('host')}/geotiff/districts/${result.codigoine.padStart(2, 0)}.tif`,
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
                input: {
                  Distrito: `<a href="/distrito/${encodeName(result.distrito)}">${result.distrito}</a>`
                },
                dataToShowOnHtml: dataToShowOnHtml,
                pageTitle: `Altimetria do Distrito de ${result.distrito}`,
                template: 'routes/districtAltitude'
              })
            }
          }).catch(err => {
            console.error(err)
            res.status(404).sendData({ error: `Erro interno ao processar o fiheiro ${geotiffFilePath}!` })
          })
        }
      })
    } else {
      res.status(404).sendData({ error: 'Distrito não encontrado!' })
    }
  }
}
