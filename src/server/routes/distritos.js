const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

module.exports = {
  fn: routeFn,
  route: [
    '/distritos',
    '/distritos/base'
  ]
}

function routeFn (req, res, next, { administrations, regions }) {
  debug(req.path, req.query, req.headers)

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
    if (isBase) {
      res.status(200).sendData({
        data: JSON.parse(JSON.stringify(administrations.listOfDistricts)), // deep clone
        input: 'Lista de distritos',
        pageTitle: 'Lista de distritos de Portugal'
      })
    } else {
      const dataToShowOnHtml = {}
      dataToShowOnHtml.Distritos = JSON.parse(JSON.stringify(administrations.listOfDistricts))
        .map(el => `<a href="/distrito/${encodeURIComponent(el.toLowerCase())}">${el}</a>`)

      res.status(200).sendData({
        data: { // in this particular case detailed data from districts is fetched client side
          bbox: regions.cont.geojson.bbox,
          keysMaping: JSON.parse(fs.readFileSync(
            path.join(appRoot.path, 'src', 'server', 'utils', 'keysMaping.json')
          ))
        },
        pageTitle: 'Lista de Distritos de Portugal',
        dataToShowOnHtml: dataToShowOnHtml,
        template: 'routes/districts'
      })
    }
  }
}
