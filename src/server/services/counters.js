/* requests counter exposed as shieldsIO JSON endpoint https://shields.io/endpoint */

const { createClient } = require('redis')

const debug = require('debug')('geoapipt:server:counters') // DEBUG=geoapipt:server:counters npm start

module.exports = { init, incrementCounters, loadExpressRoutes }

let redis

async function init () {
  redis = createClient()
  redis.on('error', err => console.error('Redis Client for Counter Error', err))
  await redis.connect()
  debug('Redis Module started')

  debug('isSingleProcessOrFirstPm2Process', isSingleProcessOrFirstPm2Process())
  if (isSingleProcessOrFirstPm2Process()) {
    await redis.set('requestsCounterPerHour', 0)
    await redis.set('requestsCounterPerDay', 0)
    setTimers()
  }
}

function setTimers () {
  setInterval(async () => {
    try {
      const requestsCounterPerHour = await redis.get('requestsCounterPerHour')
      await redis.set('requestsLastHour', requestsCounterPerHour)
    } catch {} finally {
      await redis.set('requestsCounterPerHour', 0)
    }
  }, 1000 * 60 * 60)

  setInterval(async () => {
    try {
      const requestsCounterPerDay = await redis.get('requestsCounterPerDay')
      await redis.set('requestsLastDay', requestsCounterPerDay)
    } catch {} finally {
      await redis.set('requestsCounterPerDay', 0)
    }
  }, 1000 * 60 * 60 * 24)
}

async function incrementCounters () {
  const requestsCounterPerHour = parseInt(await redis.get('requestsCounterPerHour'))
  debug('requestsCounterPerHour: ' + requestsCounterPerHour.toString())
  await redis.set('requestsCounterPerHour', requestsCounterPerHour + 1)

  const requestsCounterPerDay = parseInt(await redis.get('requestsCounterPerDay'))
  debug('requestsCounterPerDay: ' + requestsCounterPerDay.toString())
  await redis.set('requestsCounterPerDay', requestsCounterPerDay + 1)
}

function loadExpressRoutes (app) {
  app.get(/\/(shieldsio|counters)\/requestslasthour/, async function (req, res) {
    res.json({
      schemaVersion: 1,
      label: 'Requests on last hour',
      message: await getRequestsLastHour(),
      color: 'orange'
    })
  })

  app.get(/\/(shieldsio|counters)\/requestslastday/, async function (req, res) {
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
    requestsLastHour = await redis.get('requestsLastHour')
  } catch {
    try {
      requestsLastHour = await redis.get('requestsCounterPerHour')
    } catch {
      requestsLastHour = '0'
    }
  }
  debug('requestsLastHour:', requestsLastHour)
  return requestsLastHour || '0'
}

async function getRequestsLastDay () {
  let requestsLastDay
  try {
    requestsLastDay = await redis.get('requestsLastDay')
  } catch {
    try {
      requestsLastDay = await redis.get('requestsCounterPerDay')
    } catch {
      requestsLastDay = '0'
    }
  }
  debug('requestsLastDay:', requestsLastDay)
  return requestsLastDay || '0'
}

// Returns true when PM2 not involved (single process), OR
// in case PM2 runs the app in multiprocessing mode (cluster mode),
// returns true only for firt PM2 process.
function isSingleProcessOrFirstPm2Process () {
  return (!process.env.PM2_APP_INSTANCE_ID || process.env.PM2_APP_INSTANCE_ID === '0')
}
