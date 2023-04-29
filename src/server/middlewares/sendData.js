const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server')

const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))
const adaptObjForHtmlRes = require(path.join(appRoot.path, 'src', 'server', 'utils', 'adaptObjForHtmlRes.js'))

module.exports = ({ configs, shieldsioCounters }) =>
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

        const template = data.template || 'result'
        res.render(template, {
          layout: false,
          defaultOrigin: configs.defaultOrigin,
          gitProjectUrl: configs.gitProjectUrl,
          apiDocsOrigin: configs.apiDocsOrigin,
          pageTitle: data.pageTitle ? `${data.pageTitle} - ${configs.mainTitle}` : configs.mainTitle,
          pageDescription: data.pageTitle || '',
          siteDescription: configs.description,
          input: data.input || {},
          data: dataToBeSent, // this is sent to frontend Javascript code
          dataToShowOnHtml: data.dataToShowOnHtml ? adaptObjForHtmlRes(data.dataToShowOnHtml) : {}
        })
      }
    }
    next()
  }
