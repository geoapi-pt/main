/* requests counter exposed as shieldsIO JSON endpoint https://shields.io/endpoint */

const path = require('path')
const appRoot = require('app-root-path')
const { JsonDB, Config } = require('node-json-db')

const debug = require('debug')('geoapipt:server:counters')

module.exports = { setTimers, incrementCounters, loadExpressRoutes }

// a JSON "database" file is saved in root project directory as counters.json
const dbFile = path.join(appRoot.path, 'counters.json')
const db = new JsonDB(new Config(dbFile, true, false, '/'))

function dbSet (name, val) {
  return new Promise((resolve, reject) => {
    db.push('/' + name, val)
      .then(() => resolve())
      .catch(() => resolve())
  })
}

(async () => {
  await dbSet('requestsCounterPerHour', 0)
  await dbSet('requestsCounterPerDay', 0)
})()

function setTimers () {
  setInterval(async () => {
    try {
      const requestsCounterPerHour = await db.getData('/requestsCounterPerHour')
      await dbSet('requestsLastHour', requestsCounterPerHour)
    } catch {} finally {
      await dbSet('requestsCounterPerHour', 0)
    }
  }, 1000 * 60 * 60)

  setInterval(async () => {
    try {
      const requestsCounterPerDay = await db.getData('/requestsCounterPerDay')
      await dbSet('requestsLastDay', requestsCounterPerDay)
    } catch {} finally {
      await dbSet('requestsCounterPerDay', 0)
    }
  }, 1000 * 60 * 60 * 24)
}

async function incrementCounters () {
  const requestsCounterPerHour = await db.getData('/requestsCounterPerHour')
  debug('requestsCounterPerHour: ' + requestsCounterPerHour.toString())
  await dbSet('requestsCounterPerHour', requestsCounterPerHour + 1)

  const requestsCounterPerDay = await db.getData('/requestsCounterPerDay')
  debug('requestsCounterPerDay: ' + requestsCounterPerDay.toString())
  await dbSet('requestsCounterPerDay', requestsCounterPerDay + 1)
}

function loadExpressRoutes (app) {
  app.get('/shieldsio/requestslasthour', async function (req, res) {
    let requestsLastHour
    try {
      requestsLastHour = await db.getData('/requestsLastHour')
    } catch {
      requestsLastHour = 0
    }

    res.json({
      schemaVersion: 1,
      label: 'Requests on last hour',
      message: requestsLastHour.toString(),
      color: 'orange'
    })
  })

  app.get('/shieldsio/requestslastday', async function (req, res) {
    let requestsLastDay
    try {
      requestsLastDay = await db.getData('/requestsLastDay')
    } catch {
      requestsLastDay = 0
    }

    res.json({
      schemaVersion: 1,
      label: 'Requests on last day',
      message: requestsLastDay.toString(),
      color: 'orange'
    })
  })
}
