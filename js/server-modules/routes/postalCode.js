const fs = require('fs')
const path = require('path')
const sanitize = require('sanitize-filename')
const debug = require('debug')('geoapipt:server')

module.exports = {
  fn: routeFn,
  route: '/cp/:cp'
}

// route for Postal Codes: /cp/XXXX, /cp/XXXXYYY or /cp/XXXX-YYY
function routeFn (req, res, next, { serverDir }) {
  debug(req.path, req.query, req.headers)

  const cp = req.params.cp
  const cleanCp = cp.replace(/\p{Dash}/u, '')
  const cp4 = cleanCp.slice(0, 4) // first 4 digits of CP
  const cp3 = cleanCp.slice(4, 7) // last 3 digits of CP or '' when not available

  // asserts postal code is XXXX, XXXXYYY or XXXX-YYY
  if (/^\d{4}(\p{Dash}?\d{3})?$/u.test(cp) && cp4) {
    let filename
    if (cp3) {
      filename = path.join(serverDir, 'res', 'postal-codes', 'data', sanitize(cp4), sanitize(cp3 + '.json'))
    } else {
      filename = path.join(serverDir, 'res', 'postal-codes', 'data', sanitize(cp4 + '.json'))
    }

    fs.readFile(filename, (err, fileContent) => {
      if (err) {
        debug(err)
        res.status(404).sendData({ error: 'Postal Code not found!' })
      } else {
        // raw data
        const data = JSON.parse(fileContent)

        // filtered and processed data for presentation
        const processedData = JSON.parse(fileContent)
        processedData.partes = processedData.partes.map(obj => {
          for (const key in obj) {
            if (!obj[key]) delete obj[key]
          }
          return obj
        })

        const fieldsToDelette = ['CP', 'CP4', 'CP3', 'pontos', 'poligono', 'ruas', 'centro', 'centroide', 'centroDeMassa']
        if (!cp3) fieldsToDelette.push('partes')
        fieldsToDelette.forEach(el => {
          if (el in processedData) delete processedData[el]
        })

        res.status(200).sendData({
          data: data,
          input: { 'Código Postal': cp4 + (cp3 ? `-${cp3}` : '') },
          processedData: processedData,
          pageTitle: `Dados sobre o Código Postal ${cp4 + (cp3 ? `-${cp3}` : '')}`,
          template: 'postalCode'
        })
      }
    })
  } else {
    res.status(404).sendData({ error: 'Postal Code format must be /cp/XXXX, /cp/XXXXYYY or /cp/XXXX-YYY' })
  }
}
