const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))
const adaptObjForHtmlRes = require(path.join(appRoot.path, 'src', 'server', 'utils', 'adaptObjForHtmlRes.js'))

module.exports = ({ defaultOrigin, gitProjectUrl, mainTitle, siteDescription, shieldsioCounters }) =>
  (req, res, next) => {
    res.sendData = function (data) {
      debug(req.accepts(['html', 'json']))

      shieldsioCounters.incrementCounters()

      const dataToBeSent = data.error ? { erro: data.error } : data.data

      res.set('Connection', 'close')
      if (isResponseJson(req)) {
        res.json(dataToBeSent)
      } else {
        res.type('text/html')

        res.render(data.template || 'result', {
          layout: false,
          defaultOrigin: defaultOrigin,
          gitProjectUrl: gitProjectUrl,
          pageTitle: data.pageTitle ? `${data.pageTitle} - ${mainTitle}` : mainTitle,
          pageDescription: data.pageTitle || '',
          siteDescription: siteDescription,
          input: data.input || {},
          data: dataToBeSent, // this is sent to frontend Javascript code
          dataToShowOnHtml: data.dataToShowOnHtml ? adaptObjForHtmlRes(data.dataToShowOnHtml) : {}
        })
      }
    }
    next()
  }
