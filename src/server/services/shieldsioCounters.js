
/* requests counter exposed as shieldsIO JSON endpoint https://shields.io/endpoint */

module.exports = { setTimers, incrementCounters, loadExpressRoutes }

// counter of requests per hour
let requestsCounterPerHour = 0
let requestsLastHour = 0

// counter of requests per day
let requestsCounterPerDay = 0
let requestsLastDay = 0

function setTimers () {
  setInterval(() => {
    requestsLastHour = requestsCounterPerHour
    requestsCounterPerHour = 0
  }, 1000 * 60 * 60)

  setInterval(() => {
    requestsLastDay = requestsCounterPerDay
    requestsCounterPerDay = 0
  }, 1000 * 60 * 60 * 24)
}

function incrementCounters () {
  requestsCounterPerHour++
  requestsCounterPerDay++
}

function loadExpressRoutes (app) {
  app.get('/shieldsio/requestslasthour', function (req, res) {
    res.json({
      schemaVersion: 1,
      label: 'Requests on last hour',
      message: requestsLastHour.toString(),
      color: 'orange'
    })
  })

  app.get('/shieldsio/requestslastday', function (req, res) {
    res.json({
      schemaVersion: 1,
      label: 'Requests on last day',
      message: requestsLastDay.toString(),
      color: 'orange'
    })
  })
}
