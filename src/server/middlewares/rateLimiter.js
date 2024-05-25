const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const debug = require('debug')('geoapipt:server:rateLimiter')

let mysql, mysqlDb, limiter, dbPool

module.exports = {
  init: ({ defaultOrigin }) => {
    mysql = require('mysql')
    const rateLimit = require('express-rate-limit')

    mysqlDb = JSON.parse(
      fs.readFileSync(path.join(appRoot.path, '..', 'credentials.json'), 'utf8')
    ).mysql_db
    debug(mysqlDb)

    dbPool = mysql.createPool(mysqlDb)

    // this is important to avoid killing the whole process in case of error
    // see: https://github.com/mysqljs/mysql?tab=readme-ov-file#error-handling
    dbPool.on('error', (err) => {
      console.error('Error on database pool: ', err.code)
    })

    limiter = rateLimit({
      windowMs: 1000 * 60 * 60 * 24, // 1 day
      limit: rateLimitFn, // max requests per each IP in windowMs
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      message: `You have reached the limit of requests, please refer to ${defaultOrigin}/self-hosting or ${defaultOrigin}/request-api-key for unlimited use of this API`
    })

    return dbPool
  },
  middleware: ({ filename }) =>
    (req, res, next) => {
      const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))
      if (isResponseJson(req)) {
        const route = path.parse(filename).name // remove extension
        // don't apply rate linmiter to these routes
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
  const maxRequestsPerDayForNormalUsers = 30
  const maxRequestsPerDayForPremiumUsers = 1000000

  const apiAccessKey = req.query.key || req.header('X-API-Key')
  if (!apiAccessKey) {
    debug('no key provided')
    res.header('X-API-Key-Staus', 'no-key-provided')
    return maxRequestsPerDayForNormalUsers
  }
  try {
    if (await isUserPremium(apiAccessKey)) {
      debug('user is premium')
      res.header('X-API-Key-Staus', 'authenticated')
      return maxRequestsPerDayForPremiumUsers
    } else {
      debug('user is not premium')
      res.header('X-API-Key-Staus', 'no-valid-key')
      return maxRequestsPerDayForNormalUsers
    }
  } catch {
    debug('error fetching info from database')
    res.header('X-API-Key-Staus', 'error-fetching-key-from-db')
    return maxRequestsPerDayForNormalUsers
  }
}

function isUserPremium (apiAccessKey) {
  return new Promise((resolve, reject) => {
    const query =
      `SELECT ${mysql.escapeId('api_access_key')} FROM \`${mysqlDb.database}\`.${mysqlDb.db_tables.users} ` +
      `WHERE api_access_key='${apiAccessKey}'`

    dbPool.query(query, (err, results, fields) => {
      if (err) {
        console.error('Error fetching info from database: ', err.code)
        resolve(true) // not user's fault the DB is not working, assume premium
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
