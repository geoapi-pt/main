const path = require('path')
const appRoot = require('app-root-path')
const rateLimit = require('express-rate-limit')

const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 120, // max requests per each IP in windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'You have reached the limit of requests, please contact joao.pimentel.ferreira@gmail.com for unlimited use of this API and/or running it in your own machine (self-hosting)'
})

module.exports = ({ filename }) =>
  (req, res, next) => {
    if (isResponseJson(req)) {
      const route = path.parse(filename).name // remove extension
      // don't apply rate limiter to same routes
      // it allows main HTML page loading, because it needs these JSON request
      if (
        route === 'distritos' ||
        route === 'codigos_postais' ||
        route === 'municipiosFreguesias' ||
        route === 'municipiosMunicipality' ||
        route === 'municipiosFreguesias' ||
        route === 'municipiosMunicipalityFreguesias'
      ) {
        next()
      } else {
        limiter(req, res, next)
      }
    } else {
      // don't apply limiter for HTML responses, just for JSON
      next()
    }
  }
