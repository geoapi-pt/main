const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const utilsDir = path.join(appRoot.path, 'src', 'server', 'utils')

const isResponseJson = require(path.join(utilsDir, 'isResponseJson.js'))

// mapping between keys and respective description
let keysMapping = JSON.parse(fs.readFileSync(path.join(utilsDir, 'keysMaping.json')))
const censosKeysMaping = JSON.parse(fs.readFileSync(path.join(utilsDir, 'censosKeysMaping.json')))
keysMapping = keysMapping.concat(censosKeysMaping)

module.exports = {
  fn: routeFn,
  route: [
    '/distritos',
    '/distritos/base'
  ]
}

function routeFn (req, res, next, { administrations, regions }) {
  debug(req.path, req.query, req.headers)

  // if url is '/distritos/base?json=1' req.path is '/distritos/base'
  const isBase = Boolean(parseInt(req.query.base)) || (req.path && req.path.endsWith('/base'))

  if (isResponseJson(req)) {
    let result
    if (isBase) {
      result = JSON.parse(JSON.stringify(administrations.listOfDistricts)) // deep clone
    } else {
      result = JSON.parse(JSON.stringify(administrations.districtsDetails)) // deep clone
      // for info about municiaplities of each district use instead route /distritos/municipios
      result.forEach(district => {
        delete district.municipios
      })
    }
    res.status(200).sendData({ data: result })
  } else {
    const listOfDistricts = JSON.parse(JSON.stringify(administrations.listOfDistricts)) // deep clone
    const distritosHtml = listOfDistricts.map(
      el => `<a href="/distrito/${encodeURIComponent(el.toLowerCase())}">${el}</a>`
    )

    if (isBase) {
      res.status(200).sendData({
        data: distritosHtml,
        dataToShowOnHtml: distritosHtml,
        input: 'Lista de distritos',
        pageTitle: 'Lista de distritos de Portugal'
      })
    } else {
      res.status(200).sendData({
        data: { // in this particular case detailed data from districts is fetched client side
          bbox: regions.cont.geojson.bbox,
          keysMaping: keysMapping
        },
        pageTitle: 'Lista de Distritos de Portugal',
        dataToShowOnHtml: { Distritos: distritosHtml },
        template: 'routes/districts'
      })
    }
  }
}
