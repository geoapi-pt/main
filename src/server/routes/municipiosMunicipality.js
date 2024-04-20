const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')
const { normalizeName } = require(path.join(__dirname, '..', 'utils', 'commonFunctions.js'))

const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

const municipalitiesGeojsonDir = path.join(appRoot.path, '..', 'resources', 'res', 'geojson', 'municipalities')
const municipalitiesCensosDir = path.join(appRoot.path, '..', 'resources', 'res', 'censos', 'data', 'municipios')

module.exports = {
  fn: routeFn,
  route: '/municipios?/:municipality?'
}

async function routeFn (req, res, next, { administrations }) {
  debug(req.path, req.query, req.headers)

  if (
    req.params.municipality === 'freguesia' ||
    req.params.municipality === 'freguesias'
  ) {
    next()
    return
  }

  // if name is not provided in query, consider parameter from url instead
  // example /municipio/évora
  if (req.params.municipality && !req.query.nome) {
    req.query.nome = req.params.municipality
  }

  // ### validate request query ###
  // check if all parameters of request exist in municipalitiesDetails
  const keysOfMunicipalitiesDetails = administrations.keysOfMunicipalitiesDetails
  const allowableQueryParams = keysOfMunicipalitiesDetails.concat('json', 'key')

  const invalidParameters = []
  for (const param in req.query) {
    if (!req.query[param] || !allowableQueryParams.includes(param)) {
      invalidParameters.push(param)
    }
  }
  if (invalidParameters.length) {
    res.status(404).sendData({ error: `These parameters are invalid or don't exist for ${req.path}: ${invalidParameters}` })
    return
  }
  // ### request query is valid from here ###

  const arrayOfQueryParam = Object.keys(req.query)

  if (
    !arrayOfQueryParam.some(par => keysOfMunicipalitiesDetails.includes(par))
  ) {
    // no nome nor query parameters were provided
    // shows just a list of all municipalities in this case
    const _result = administrations.listOfMunicipalitiesNames
    const result = JSON.parse(JSON.stringify(_result)) // deep clone

    if (isResponseJson(req)) {
      res.status(200).sendData({ data: result })
    } else {
      let resultHtml = result
      resultHtml = resultHtml.map(el => `<a href="/municipio/${encodeURIComponent(el.toLowerCase())}">${el}</a>`)

      res.status(200).sendData({
        data: resultHtml,
        input: 'Lista de todos os municípios',
        pageTitle: 'Lista dos municípios de Portugal'
      })
    }
  } else {
    // search municipality first by name and then by other fields (nif, codigopostal, etc.)
    const { nome } = req.query
    let results = [...administrations.municipalitiesDetails]

    // search for name
    if (nome) {
      const municipalityToFind = normalizeName(nome)
      results = results.filter(
        municipality => normalizeName(municipality.nome) === municipalityToFind
      )
    }

    // remaining filters: ['codigo', 'nif', 'codigopostal'...] except 'nome'
    // remove 'nome' from keysOfMunicipalitiesDetails
    const filters = keysOfMunicipalitiesDetails.filter(par => par !== 'nome')

    for (const filter of filters) {
      if (req.query[filter]) {
        results = results.filter(p => p[filter] == req.query[filter]) // eslint-disable-line eqeqeq
      }
    }

    results = JSON.parse(JSON.stringify(results)) // deep clone

    if (results.length > 1) {
      res.status(200).sendData({
        data: results,
        input: 'Lista de municípios',
        pageTitle: `Dados sobre municípios: ${results.map(e => `${e.nome}`).join(', ')}`
      })
    } else if (results.length === 1) {
      const result = results[0]

      const geojsonFile = path.join(municipalitiesGeojsonDir, result.codigoine.padStart(4, '0') + '.json')
      const municipalityCodeNoLeadingZeros = parseInt(result.codigoine.padStart(4, '0')).toString() // to remove leading zeros
      const censosFile = path.join(municipalitiesCensosDir, municipalityCodeNoLeadingZeros + '.json')

      const promisesArray = []
      if (fs.existsSync(geojsonFile)) {
        promisesArray.push(fs.promises.readFile(geojsonFile))
      } else {
        res.status(404).sendData({ error: `Ficheiro Geojson ${path.relative(appRoot.path, geojsonFile)} não encontrado!` })
        return
      }
      if (fs.existsSync(censosFile)) {
        promisesArray.push(fs.promises.readFile(censosFile))
      } else {
        // if censos file is not available, still continues
        console.error(`Ficheiro de Censos ${path.relative(appRoot.path, censosFile)} não encontrado!`)
      }

      const dataFromFiles = await Promise.all(promisesArray)
      const municipalityGeojsons = JSON.parse(dataFromFiles[0])

      if (municipalityGeojsons) {
        result.geojsons = municipalityGeojsons
      }

      // data related to censos file from promisesArray[1]
      if (dataFromFiles[1]) {
        const municipalityCensos = JSON.parse(dataFromFiles[1])
        if (municipalityCensos) {
          for (const key in municipalityCensos) {
            if (key.startsWith('censos')) {
              result[key] = municipalityCensos[key]
            }
          }
        }
      }

      if (isResponseJson(req)) {
        res.status(200).sendData({ data: result })
      } else {
        // html/text response
        const dataToShowOnHtml = JSON.parse(JSON.stringify(result)) // deep clone

        // no need to show geojsons on html page
        if (municipalityGeojsons) {
          delete dataToShowOnHtml.geojsons
          dataToShowOnHtml.centros = Object.assign({}, municipalityGeojsons.municipio.properties.centros)
        }

        // information already available in section Censos
        delete dataToShowOnHtml.populacao

        const encodeName = (str) => {
          return encodeURIComponent(str.toLowerCase())
        }

        res.status(200).sendData({
          data: result,
          input: {
            Município: `${result.nome} (<a href="/municipio/${encodeName(nome)}/freguesias">Freguesias</a>, <a href="/municipio/${encodeName(nome)}/altimetria">Altimetria</a>)`
          },
          dataToShowOnHtml: dataToShowOnHtml,
          pageTitle: `Dados sobre o Município de ${result.nome}`,
          template: 'routes/municipality'
        })
      }
    } else {
      res.status(404).sendData({ error: 'Município não encontrado!' })
    }
  }
}
