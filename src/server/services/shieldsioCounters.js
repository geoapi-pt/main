/* requests counter exposed as shieldsIO JSON endpoint https://shields.io/endpoint */

const Loki = require('lokijs')

const db = new Loki('counters.db')
const counters = db.addCollection('counters')
const debug = require('debug')('geoapipt:server:counters')

module.exports = { setTimers, incrementCounters, loadExpressRoutes }

const requestsCounterPerHour = counters.insert({ name: 'requestsCounterPerHour', value: 0 })
const requestsLastHour = counters.insert({ name: 'requestsLastHour', value: 0 })
const requestsCounterPerDay = counters.insert({ name: 'requestsCounterPerDay', value: 0 })
const requestsLastDay = counters.insert({ name: 'requestsLastDay', value: 0 })

function getCounter (counter) {
  return counters.findOne({ name: counter }).value
}

function setTimers () {
  setInterval(() => {
    requestsLastHour.value = getCounter('requestsCounterPerHour')
    counters.update(requestsLastHour)

    requestsCounterPerHour.value = 0
    counters.update(requestsCounterPerHour)
  }, 1000 * 60 * 60)

  setInterval(() => {
    requestsLastDay.value = getCounter('requestsCounterPerDay')
    counters.update(requestsLastDay)

    requestsCounterPerDay.value = 0
    counters.update(requestsCounterPerDay)
  }, 1000 * 60 * 60 * 24)
}

function incrementCounters () {
  requestsCounterPerHour.value = getCounter('requestsCounterPerHour') + 1
  debug(requestsCounterPerHour)
  counters.update(requestsCounterPerHour)

  requestsCounterPerDay.value = getCounter('requestsCounterPerDay') + 1
  debug(requestsCounterPerDay)
  counters.update(requestsCounterPerDay)
}

function loadExpressRoutes (app) {
  app.get('/shieldsio/requestslasthour', function (req, res) {
    res.json({
      schemaVersion: 1,
      label: 'Requests on last hour',
      message: getCounter('requestsLastHour').toString(),
      color: 'orange'
    })
  })

  app.get('/shieldsio/requestslastday', function (req, res) {
    res.json({
      schemaVersion: 1,
      label: 'Requests on last day',
      message: getCounter('requestsLastDay').toString(),
      color: 'orange'
    })
  })
}
