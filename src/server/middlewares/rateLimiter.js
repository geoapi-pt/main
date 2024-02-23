const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server:rateLimiter')

let mysql, mysqlDb, limiter, dbPool

module.exports = {
  init: () => {
    mysql = require('mysql')
    const rateLimit = require('express-rate-limit')

    mysqlDb = JSON.parse(
      fs.readFileSync(path.join(appRoot.path, 'credentials.json'), 'utf8')
    ).mysql_db
    debug(mysqlDb)

    dbPool = mysql.createPool(mysqlDb)

    limiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      limit: rateLimitFn, // max requests per each IP in windowMs
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      message: 'You have reached the limit of requests, please contact joao.pimentel.ferreira@gmail.com for unlimited use of this API and/or running it in your own machine (self-hosting)'
    })
  },
  middleware: ({ filename }) =>
    (req, res, next) => {
      const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))
      if (isResponseJson(req)) {
        const route = path.parse(filename).name // remove extension
        // don't apply rate linmiter to same routes
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
}

async function rateLimitFn (req, res) {
  const maxRequestsPerHourForNormalUsers = 60
  const maxRequestsPerHourForPremiumUsers = 1000 * 60 * 60

  const apiAccessKey = req.query.key || req.header('X-API-Key')
  if (!apiAccessKey) {
    debug('no key provided')
    return maxRequestsPerHourForNormalUsers
  }
  try {
    if (await isUserPremium(apiAccessKey)) {
      debug('user is premium')
      return maxRequestsPerHourForPremiumUsers
    } else {
      debug('user is not premium')
      return maxRequestsPerHourForNormalUsers
    }
  } catch {
    debug('error fetching info from database')
    return maxRequestsPerHourForNormalUsers
  }
}

function isUserPremium (apiAccessKey) {
  return new Promise((resolve, reject) => {
    const query =
      `SELECT ${mysql.escapeId('api_access_key')} FROM \`${mysqlDb.database}\`.${mysqlDb.db_tables.users} ` +
      `WHERE api_access_key='${apiAccessKey}'`

    dbPool.query(query, (err, results, fields) => {
      if (err) {
        // error handling code goes here
        console.error('Error fetching info from database: ', err)
        reject(Error('Error fetching key from database'))
      } else {
        debug('result from db: ', results)
        if (results.length) {
          resolve(true)
        } else {
          resolve(false)
        }
      }
    })
  })
}
