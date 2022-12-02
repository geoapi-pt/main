const debug = require('debug')('geoapipt:server')

module.exports = ({ defaultOrigin, gitProjectUrl, mainTitle, siteDescription, shieldsioCounters }) =>
  (req, res, next) => {
    res.sendData = function (data) {
      debug(req.accepts(['html', 'json']))

      shieldsioCounters.incrementCounters()

      const dataToBeSent = data.error ? { erro: data.error } : data.data

      res.set('Connection', 'close')
      if (
        req.accepts(['html', 'json']) === 'json' ||
        (req.get('accept') && req.get('accept').includes('application/json')) ||
        (req.hostname && req.hostname.startsWith('json.')) ||
        parseInt(req.query.json) || req.query.json === 'true'
      ) {
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
          data: dataToBeSent,
          typeOfLink: data.typeOfLink || '',
          dataToShowOnHtml: data.dataToShowOnHtml || {}
        })
      }
    }
    next()
  }
