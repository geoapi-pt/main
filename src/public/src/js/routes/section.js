/* global L */
import '../components.js'

import * as leafletContextmenu from '../map/leafletContextmenu.js'
import * as mapFunctions from '../map/map-functions.js'

const sectionDataDomEl = document.getElementById('section-route-data')
const sectionData = JSON.parse(decodeURIComponent(sectionDataDomEl.dataset.sectionroute))
window.sectionData = sectionData

console.log('geojsons:', sectionData.geojson)

const map = L.map('map', leafletContextmenu.mapOtions)
leafletContextmenu.setMap(map)
mapFunctions.setMap(map)

const bbox = sectionData.geojson.bbox
const corner1 = L.latLng(bbox[1], bbox[0])
const corner2 = L.latLng(bbox[3], bbox[2])
const bounds = L.latLngBounds(corner1, corner2)
map.fitBounds(bounds)

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map)

L.geoJSON(sectionData.geojson, {
  style: {
    stroke: true,
    color: '#9933ff',
    weight: 2,
    opacity: 0.7,
    fill: true,
    fillColor: '#7300e6',
    fillOpacity: 0.15,
    smoothFactor: 0.5,
    interactive: false
  }
}).addTo(map)
