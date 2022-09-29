const debug = require('debug')('geoapipt:server')

module.exports = ({ mainTitle, siteDescription, shieldsioCounters }) => (req, res, next) => {
  res.sendData = function (data) {
    debug(req.accepts(['html', 'json']))

    shieldsioCounters.incrementCounters()

    const dataToBeSent = data.error ? { erro: data.error } : data.data

    res.set('Connection', 'close')
    if (req.accepts(['html', 'json']) === 'json' || parseInt(req.query.json)) {
      res.json(dataToBeSent)
    } else {
      res.type('text/html')

      res.render(data.template || 'home', {
        layout: false,
        data: dataToBeSent,
        input: data.input || {},
        processedData: data.processedData || {},
        pageTitle: data.pageTitle ? `${data.pageTitle} - ${mainTitle}` : mainTitle,
        siteDescription: siteDescription
      })
    }
  }
  next()
}
