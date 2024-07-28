/* global L */
import '../components-map.js'

import * as leafletContextmenu from '../map/leafletContextmenu.js'
import { setLayers } from '../map/leafletLayers.js'
import * as mapFunctions from '../map/map-functions.js'

const gpsDataDomEl = document.getElementById('gps-route-data')
const gpsData = JSON.parse(decodeURIComponent(gpsDataDomEl.dataset.gpsroute))
window.gpsData = gpsData

const map = L.map('map', leafletContextmenu.mapOtions).setView([gpsData.lat, gpsData.lon], 16)
leafletContextmenu.setMap(map)
mapFunctions.setMap(map)

setLayers(L, map)

const marker = new L.Marker([gpsData.lat, gpsData.lon], { draggable: 'true' })
marker.addTo(map)
marker.on('dragend', function (event) {
  const marker = event.target
  const position = marker.getLatLng()

  const regex = /\/gps\/([\d.-]+,[\d.-]+)(.*)$/g
  window.location.href = window.location.href.replace(regex, `/gps/${position.lat},${position.lng}$2`)
})

// Toggle open all details elements, onload
// Regardless of their initial status
window.onload = (event) => {
  document.body.querySelectorAll('details')
    .forEach((e) => {
      (e.hasAttribute('open'))
        ? e.removeAttribute('open')
        : e.setAttribute('open', true)
    })
}
