const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const sanitize = require('sanitize-filename')
const debug = require('debug')('geoapipt:server')

const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))
const { isValidPostalCode } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'commonFunctions.js'))

module.exports = {
  fn: routeFn,
  route: [
    '/cp/:cp',
    '/codigo_postal/:cp'
  ]
}

// route for Postal Codes: /codigo_postal/XXXX, /codigo_postal/XXXXYYY or /codigo_postal/XXXX-YYY
function routeFn (req, res, next, { appRootPath }) {
  debug(req.path, req.query, req.headers)

  const cp = req.params.cp
  const cleanCp = cp.replace(/\p{Dash}/u, '')
  const cp4 = cleanCp.slice(0, 4) // first 4 digits of CP
  const cp3 = cleanCp.slice(4, 7) // last 3 digits of CP or '' when not available

  if (isValidPostalCode(cp) && cp4) {
    let filename
    if (cp3) {
      filename = path.join(appRootPath, 'res', 'postal-codes', 'data', sanitize(cp4), sanitize(cp3 + '.json'))
    } else {
      filename = path.join(appRootPath, 'res', 'postal-codes', 'data', sanitize(cp4 + '.json'))
    }

    fs.readFile(filename, (err, fileContent) => {
      if (err) {
        debug(err)
        res.status(404).sendData({ error: 'Postal Code not found!' })
      } else {
        // raw data
        const data = JSON.parse(fileContent)

        if (isResponseJson(req)) {
          res.status(200).sendData({ data: data })
        } else {
          // text/html
          // filtered and processed data for presentation
          const dataToShowOnHtml = JSON.parse(fileContent)
          dataToShowOnHtml.partes = dataToShowOnHtml.partes.map(obj => {
            for (const key in obj) {
              if (!obj[key]) delete obj[key]
            }
            return obj
          })

          const fieldsToDelete = ['CP', 'CP4', 'CP3', 'pontos', 'partes', 'outliers', 'poligono', 'ruas', 'centroide', 'centroDeMassa']
          fieldsToDelete.forEach(el => {
            if (el in dataToShowOnHtml) delete dataToShowOnHtml[el]
          })

          // rename key Concelho => Município
          delete Object.assign(dataToShowOnHtml, { Município: dataToShowOnHtml.Concelho }).Concelho

          if (dataToShowOnHtml.centro && Array.isArray(dataToShowOnHtml.centro)) {
            const centro = dataToShowOnHtml.centro
            dataToShowOnHtml.Centro =
              `<a href="/gps/${centro[0]},${centro[1]}">${centro[0]},${centro[1]}</a>`
            delete dataToShowOnHtml.centro
          }

          res.status(200).sendData({
            data: data,
            input: { 'Código Postal': cp4 + (cp3 ? `-${cp3}` : '') },
            dataToShowOnHtml: dataToShowOnHtml,
            pageTitle: `Dados sobre o Código Postal ${cp4 + (cp3 ? `-${cp3}` : '')}`,
            template: 'routes/codigo_postal'
          })
        }
      }
    })
  } else {
    res.status(404).sendData({ error: 'Postal Code format must be /codigo_postal/XXXX, /codigo_postal/XXXXYYY or /codigo_postal/XXXX-YYY' })
  }
}
