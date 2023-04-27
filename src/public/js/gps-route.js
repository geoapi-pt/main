/* global L */

import * as leafletContextmenu from './leafletContextmenu.js'
import * as mapFunctions from './map-functions.js'

const gpsDataDomEl = document.getElementById('gps-route-data')
const gpsData = JSON.parse(decodeURIComponent(gpsDataDomEl.dataset.gpsroute))
window.gpsData = gpsData

const map = L.map('map', leafletContextmenu.mapOtions).setView([gpsData.lat, gpsData.lon], 16)
leafletContextmenu.setMap(map)
mapFunctions.setMap(map)

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map)

const marker = new L.Marker([gpsData.lat, gpsData.lon], { draggable: 'true' })
marker.addTo(map)
marker.on('dragend', function (event) {
  const marker = event.target
  const position = marker.getLatLng()

  const regex = /\/gps\/([\d.-]+,[\d.-]+)(.*)$/g
  window.location.href = window.location.href.replace(regex, `/gps/${position.lat},${position.lng}$2`)
})
