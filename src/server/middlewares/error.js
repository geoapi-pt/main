const debug = require('debug')('geoapipt:server')

module.exports = ({ gitProjectUrl }) =>
  (err, req, res, next) => {
    debug(err)

    const errMsg = (err.path ? `Erro no caminho ${err.path}: ` : '') +
      (err.message ? `${err.message}. ` : '') +
      `Ler instruções em ${gitProjectUrl}`

    res.status(err.status || 500).sendData({
      error: errMsg
    })
  }
