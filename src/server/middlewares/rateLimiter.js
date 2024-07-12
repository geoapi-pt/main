const fs = require('fs')
const path = require('path')
const mysql = require('mysql')
const sqlFormatter = require('sql-formatter')
const rateLimit = require('express-rate-limit')
const appRoot = require('app-root-path')
const colors = require('colors/safe')

// DEBUG=geoapipt:server:rateLimiter npm start -- --rateLimit
const debug = require('debug')('geoapipt:server:rateLimiter')

const isResponseJson = require(path.join(appRoot.path, 'src', 'server', 'utils', 'isResponseJson.js'))

let mysqlDb, limiter, dbPool, defaultOrigin

module.exports = {
  init: ({ defaultOrigin_ }) => {
    defaultOrigin = defaultOrigin_

    mysqlDb = JSON.parse(
      fs.readFileSync(path.join(appRoot.path, '..', 'credentials.json'), 'utf8')
    ).mysql_db
    debug(mysqlDb)

    dbPool = mysql.createPool(mysqlDb)

    // This is important to avoid killing the whole process in case of error
    // see: https://github.com/mysqljs/mysql?tab=readme-ov-file#error-handling
    dbPool.on('error', (err) => {
      console.error('Error on database pool: ', err.code)
    })

    dbPool.getConnection((err, connection) => {
      if (err) {
        console.error('Error getting pool connection :', err.code)
      } else {
        console.log(`Connection to Database ${colors.green.bold('successful')}`)
      }
    })

    limiter = rateLimit({
      windowMs: 1000 * 60 * 60 * 24, // 1 day
      limit: rateLimitFn, // max requests per each IP in windowMs
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      handler: handlerLimitReachedFn
    })

    return dbPool
  },
  middleware: (route) =>
    async (req, res, next) => {
      debug('\n\n\n====================================', req.originalUrl, '===================================')
      console.log(res.locals.isGoogleCrawler)
      if (route === 'rate_limiter_test_path') {
        // don't apply rate limiter for /rate_limiter_test_path in either JSON or HTML,
        // but yet inform about validity of the key
        res.header('X-API-Key-Staus', await getApiAccessKeyStatus(req))
        next()
      } if (res.locals.isGoogleCrawler) {
        // don't apply rate limiter for Google Bots/Crawlers
        next()
      } else {
        if (isResponseJson(req)) {
          // don't apply rate linmiter to these JSON routes,
          // since the main index HTML page makes several of these JSON requests to work properly
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
          limiter(req, res, next)
        }
      }
    }
}

async function rateLimitFn (req, res) {
  const maxRequestsPerDayForNormalUsers = isResponseJson(req) ? 15 : 5
  const maxRequestsPerDayForPremiumUsers = 1000000

  const apiAccessKey = getApiAccessKey(req)

  const apiAccessKeyStatus = await getApiAccessKeyStatus(req)
  res.header('X-API-Key-Staus', apiAccessKeyStatus)

  switch (apiAccessKeyStatus) {
    case 'authenticated':
      debug('User is PREMIUM')
      incrementAccessKeyCount(apiAccessKey)
      return maxRequestsPerDayForPremiumUsers
    case 'no-key-provided':
      debug('NO KEY provided')
      return maxRequestsPerDayForNormalUsers
    case 'no-valid-key':
      debug('User is NOT Premium')
      return maxRequestsPerDayForNormalUsers
    case 'error-fetching-key-from-db':
      debug('Error fetching info from database')
      return maxRequestsPerDayForNormalUsers
    default:
      debug('Unknown error')
      return maxRequestsPerDayForNormalUsers
  }
}

function handlerLimitReachedFn (req, res, next, options) {
  res.status(options.statusCode)
  if (isResponseJson(req)) {
    res.json({ msg: `You have reached the limit of requests, please refer to ${defaultOrigin}/self-hosting or ${defaultOrigin}/request-api-key for unlimited use of this API` })
  } else {
    // 429 http response code for "too many requests"
    res.status(429).sendData({ template: 'limitReachedApiKey' })
  }
}

async function getApiAccessKeyStatus (req) {
  const apiAccessKey = getApiAccessKey(req)
  if (apiAccessKey) {
    try {
      if (await isUserPremium(apiAccessKey)) {
        return 'authenticated'
      } else {
        return 'no-valid-key'
      }
    } catch {
      return 'error-fetching-key-from-db'
    }
  } else {
    return 'no-key-provided'
  }
}

function getApiAccessKey (req) {
  if (isResponseJson(req)) {
    return req.query.key || req.header('X-API-Key')
  } else {
    return req.header('X-API-Key') || req.cookies.key
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
        resolve(Boolean(results.length))
      }
    })
  })
}

// UPDATE `geoapi.pt`.users SET `api_key_total_requests` = `api_key_total_requests` + 1 WHERE `api_access_key`='6df68f9d-33d6-4269-9264-098266b308c7';
function incrementAccessKeyCount (apiAccessKey) {
  const query =
    `UPDATE \`${mysqlDb.database}\`.${mysqlDb.db_tables.users} ` +
    `SET ${mysql.escapeId('api_key_total_requests')} = ${mysql.escapeId('api_key_total_requests')} + 1 ` +
    `WHERE api_access_key='${apiAccessKey}'`

  debug('\n', sqlFormatter.format(query), '\n')

  dbPool.query(query, (err, results, fields) => {
    if (err) {
      console.error('Error updating counter in MySQL DB: ', err.code)
      debug(err)
    } else {
      debug('Stats Count increment OK for key: ', apiAccessKey)
    }
  })
}
