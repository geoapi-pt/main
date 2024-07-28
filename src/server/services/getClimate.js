// Module that for every X minutes fetches data from IPMA API,
// and creates for each variable (temperature, humidity, pression)
// the respective Triangulated Irregular Network (TIN), sorting each triangle by area/surface.
// Then, for every incoming request with coordinates of the point, it finds which trinagles contain the point,
// and gets the first 5 triangles, doing then therein linear interpolation to deduce the variables on that point.
// If the point does not fit within any triangle from the TIN, finds the nearest point/station instead
// This two-steps approach allows fast processing
// For context of this problem see: https://earthscience.stackexchange.com/q/26399/33146

const got = require('got')
const turf = require('@turf/turf')
const debug = require('debug')('geoapipt:getClimate')

// see https://api.ipma.pt/
// Lista de identificadores das estações meteorológicas
const ipmaStationsListUrl = 'https://api.ipma.pt/open-data/observation/meteorology/stations/stations.json'
// Observação Meteorológica de Estações (dados horários, últimas 24 horas)
const ipmaStationsObsUrl = 'https://api.ipma.pt/open-data/observation/meteorology/stations/observations.json'

const intervalToFetchData = 10 * 60 * 1000 // 10 minutes

let latestDateTime, tinTemperature, tinHumidity, tinPression
let featureCollectionTemperature, featureCollectionHumidity, featureCollectionPression

module.exports = { init, get }

function init (callback) {
  const fetchData = () => {
    return new Promise((resolve, reject) => {
      Promise.all([got(ipmaStationsListUrl).json(), got(ipmaStationsObsUrl).json()])
        .then(results => {
          const ipmaStationsList = results[0]
          const ipmaStationsObs = results[1]

          // find the most recent data
          const datesTimes = Object.keys(ipmaStationsObs)
          datesTimes.sort((a, b) => (new Date(b)) - (new Date(a)))
          latestDateTime = datesTimes[0]
          const latestObsData = ipmaStationsObs[latestDateTime]

          // build array of GeoJSON features corresponding to stations/points with latest data
          const features = ipmaStationsList
          features.forEach((station) => {
            station.properties = { ...station.properties, ...latestObsData[station.properties.idEstacao.toString()] }
          })

          // Temperature
          featureCollectionTemperature = {
            type: 'FeatureCollection',
            features: features.filter(el => el.properties.temperatura > -50) // filter out outliers
          }

          // create a set of triangles whose vertices are the points, aka Triangulated Irregular Network
          tinTemperature = turf.tin(featureCollectionTemperature, 'temperatura')
          // sort triangles by area/surface
          tinTemperature.features.sort((a, b) => turf.area(a) - turf.area(b))

          // Humidity
          featureCollectionHumidity = {
            type: 'FeatureCollection',
            features: features.filter(el => el.properties.humidade > 0) // filter out outliers
          }

          // create a set of triangles whose vertices are the points, aka Triangulated Irregular Network
          tinHumidity = turf.tin(featureCollectionHumidity, 'humidade')
          // sort triangles by area/surface
          tinHumidity.features.sort((a, b) => turf.area(a) - turf.area(b))

          // Pression
          featureCollectionPression = {
            type: 'FeatureCollection',
            features: features.filter(el => el.properties.pressao > 0) // filter out outliers
          }

          // create a set of triangles whose vertices are the points, aka Triangulated Irregular Network
          tinPression = turf.tin(featureCollectionPression, 'pressao')
          // sort triangles by area/surface
          tinPression.features.sort((a, b) => turf.area(a) - turf.area(b))

          debug('IPMA data fetched and pre-processed OK')
          resolve()
        })
        .catch((err) => {
          if (err) {
            reject(Error('IPMA API down: ' + err.message))
          } else {
            reject(Error('IPMA API down'))
          }
        })
    })
  }

  setInterval(() => {
    fetchData().catch(err => console.error(err))
  }, intervalToFetchData)

  fetchData()
    .then(() => {
      callback()
    })
    .catch(err => {
      callback(Error(err))
    })
}

function get ({ lat, lon }) {
  const point = turf.point([lon, lat])

  // Temperature
  let trianglesCoveringPoint = []
  for (const poly of tinTemperature.features) {
    if (turf.booleanPointInPolygon(point, poly)) {
      trianglesCoveringPoint.push(poly)
    }
  }

  // get the first 5 triangles
  trianglesCoveringPoint = trianglesCoveringPoint.slice(0, 5)

  let values = [] // interpolated values
  for (const triangle of trianglesCoveringPoint) {
    values.push(turf.planepoint(point, triangle))
  }

  let temperature
  if (values.length) {
    temperature = Math.round(average(values))
  } else {
    // point does not fit within any Triangle, i.e., point is outside the Triangulated Irregular Network
    // just find the nearest point and get that data
    const nearest = turf.nearestPoint(point, featureCollectionTemperature)
    temperature = nearest.properties.temperatura
  }
  // *********************************** */

  // Humidity
  trianglesCoveringPoint = []
  for (const poly of tinHumidity.features) {
    if (turf.booleanPointInPolygon(point, poly)) {
      trianglesCoveringPoint.push(poly)
    }
  }

  // get the first 5 triangles
  trianglesCoveringPoint = trianglesCoveringPoint.slice(0, 5)

  values = [] // interpolated values
  for (const triangle of trianglesCoveringPoint) {
    values.push(turf.planepoint(point, triangle))
  }

  let humidity
  if (values.length) {
    humidity = Math.round(average(values))
  } else {
    // point does not fit within any Triangle, i.e., point is outside the Triangulated Irregular Network
    // just find the nearest point and get that data
    const nearest = turf.nearestPoint(point, featureCollectionHumidity)
    humidity = nearest.properties.humidade
  }
  // *********************************** */

  // Pression
  trianglesCoveringPoint = []
  for (const poly of tinPression.features) {
    if (turf.booleanPointInPolygon(point, poly)) {
      trianglesCoveringPoint.push(poly)
    }
  }

  // get the first 5 triangles
  trianglesCoveringPoint = trianglesCoveringPoint.slice(0, 5)

  values = [] // interpolated values
  for (const triangle of trianglesCoveringPoint) {
    values.push(turf.planepoint(point, triangle))
  }

  let pression
  if (values.length) {
    pression = Math.round(average(values))
  } else {
    // point does not fit within any Triangle, i.e., point is outside the Triangulated Irregular Network
    // just find the nearest point and get that data
    const nearest = turf.nearestPoint(point, featureCollectionPression)
    pression = nearest.properties.pressao
  }
  // *********************************** */

  return {
    data_medicao: (new Date(latestDateTime)).toLocaleDateString('pt-PT'),
    hora_medicao: (new Date(latestDateTime)).toLocaleTimeString('pt-PT'),
    temperatura_C: temperature,
    'humidade_%': humidity,
    pressao_hPa: pression
  }
}

// function to find average of array
function average (array) {
  return array.reduce((a, b) => a + b) / array.length
}
