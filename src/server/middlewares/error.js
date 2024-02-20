const debug = require('debug')('geoapipt:server')

module.exports = () =>
  (err, req, res, next) => {
    debug(err)

    const errMsg = (err.path ? `Erro no caminho ${err.path}: ` : '') +
      (err.message ? `${err.message}. ` : '') +
      `Ler instruções em ${req.get('host')}/docs`

    res.status(err.status || 500)
    if (!res.headersSent) {
      res.sendData({ error: errMsg })
    }
  }
