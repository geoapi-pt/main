const path = require('path')
const rateLimit = require('express-rate-limit')

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 120, // max requests per each IP in windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'You have reached the limit of requests, please contact joao.pimentel.ferreira@gmail.com for unlimited use of this API and/or running it in your own machine (self-hosting)'
})

module.exports = ({ filename }) =>
  (req, res, next) => {
    const route = path.parse(filename).name // remove extension
    // don't apply rate linmiter to same routes
    if (
      route === 'distritos' ||
      route === 'codigos_postais' ||
      route === 'municipiosFreguesias' ||
      route === 'municipiosMunicipality'
    ) {
      next()
    } else {
      limiter(req, res, next)
    }
  }
