const path = require('path')
const minify = require('html-minifier').minify
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
        }, (err, rawHtml) => {
          if (err && !res.headersSent) {
            res.status(500).send(`Erro ao processar o template ${template} no caminho ${req.originalUrl}`)
            console.error(err)
          } else {
            if (process.env.NODE_ENV === 'production') {
              res.send(minify(rawHtml, {
                collapseWhitespace: true, // collapse white space that contributes to text nodes in a document tree
                removeComments: true, // strip HTML comments
                removeOptionalTags: true, // remove optional tags http://perfectionkills.com/experimenting-with-html-minifier/#remove_optional_tags
                caseSensitive: true // treat attributes in case sensitive manner (useful for custom HTML tags)))
              }))
            } else {
              res.send(rawHtml)
            }
          }
        })
      }
    }
    next()
  }
