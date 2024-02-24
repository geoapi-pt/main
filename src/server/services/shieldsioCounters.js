/* requests counter exposed as shieldsIO JSON endpoint https://shields.io/endpoint */

const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')
const { JsonDB, Config } = require('node-json-db')

const debug = require('debug')('geoapipt:server:counters')

module.exports = { setTimers, incrementCounters, loadExpressRoutes, getRequestsLastHour, getRequestsLastDay }

// a JSON "database" file is saved in root project directory as counters.json
const dbFile = path.join(appRoot.path, 'counters.json')
const db = new JsonDB(new Config(dbFile, true, false, '/'))

// if does not exit or it's empty
if (!fs.existsSync(dbFile) || fs.statSync(dbFile).size === 0) {
  fs.writeFileSync(dbFile, JSON.stringify({}))
}

function dbSet (name, val) {
  return new Promise((resolve, reject) => {
    db.push('/' + name, val)
      .finally(() => {
        resolve()
      })
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
    res.json({
      schemaVersion: 1,
      label: 'Requests on last hour',
      message: await getRequestsLastHour(),
      color: 'orange'
    })
  })

  app.get('/shieldsio/requestslastday', async function (req, res) {
    res.json({
      schemaVersion: 1,
      label: 'Requests on last day',
      message: await getRequestsLastDay(),
      color: 'orange'
    })
  })
}

async function getRequestsLastHour () {
  let requestsLastHour
  try {
    requestsLastHour = await db.getData('/requestsLastHour')
  } catch {
    try {
      requestsLastHour = await db.getData('/requestsCounterPerHour')
    } catch {
      requestsLastHour = 0
    }
  }
  return requestsLastHour.toString()
}

async function getRequestsLastDay () {
  let requestsLastDay
  try {
    requestsLastDay = await db.getData('/requestsLastDay')
  } catch {
    try {
      requestsLastDay = await db.getData('/requestsCounterPerDay')
    } catch {
      requestsLastDay = 0
    }
  }
  return requestsLastDay.toString()
}
