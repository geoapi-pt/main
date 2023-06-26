module.exports = {
  fn: routeFn,
  route: '/cp/'
}

// route for Postal Codes: /cp/XXXX, /cp/XXXXYYY or /cp/XXXX-YYY
function routeFn (req, res, next) {
  res.status(200).sendData({
    pageTitle: 'Obter dados sobre Código Postal',
    template: 'routes/cpRoot'
  })
}
