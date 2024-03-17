/* global L */
import 'bootstrap'
import * as leafletContextmenu from '../map/leafletContextmenu.js'
import { mobileCheck } from '../functions.js'
import * as mapFunctions from '../map/map-functions.js'

const districtMunicipalitiesDataDomEl = document.getElementById('district-municipalities-route-data')
const districtMunicipalitiesData = JSON.parse(decodeURIComponent(districtMunicipalitiesDataDomEl.dataset.districtmunicipalitiesroute))
window.districtMunicipalitiesData = districtMunicipalitiesData

const geojsons = districtMunicipalitiesData.geojsons
console.log('geojsons:', geojsons)

const municipalitiesGeoJsonFeatureCollection = mapFunctions.getGeojsonFeatureCollection(geojsons.municipios)

const centros = geojsons.distrito.properties.centros
const centro = centros.centro

const map = L.map('map', leafletContextmenu.mapOtions).setView([centro[1], centro[0]], 16)
leafletContextmenu.setMap(map)
mapFunctions.setMap(map)

const bbox = geojsons.distrito.bbox
const corner1 = L.latLng(bbox[1], bbox[0])
const corner2 = L.latLng(bbox[3], bbox[2])
const bounds = L.latLngBounds(corner1, corner2)
map.fitBounds(bounds)

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map)

// control that shows state info on hover
const info = L.control()

info.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info')
  this.update()
  return this._div
}

info.update = function (props) {
  let contents = '<h4>Municípios</h4>'

  if (props && props.Concelho) {
    contents += `<b>${props.Concelho}</b>`
  } else {
    if (mobileCheck()) {
      contents = 'Toque num município ou faça-lhe duplo toque.<br>Pressione longamente num ponto do mapa para mais opções.'
    } else {
      contents = '<b>Mova o rato sobre um município ou faça-lhe (duplo)clique.<br>Clique no botão direito do rato num ponto do mapa para mais opções.</b>'
    }
  }

  this._div.innerHTML = contents
}

info.addTo(map)

const geojsonLayer = L.geoJson(municipalitiesGeoJsonFeatureCollection, {
  style: mapFunctions.style,
  onEachFeature
}).addTo(map)

function onEachFeature (feature, layer) {
  layer.on({
    mouseover: mapFunctions.getHighlightFeature(info),
    mouseout: resetHighlight,
    click: (e) => mapFunctions.getZoomToFeature(e),
    dblclick: forwardToPage
  })
}

function resetHighlight (e) {
  geojsonLayer.resetStyle(e.target)
  info.update()
}

function forwardToPage (e) {
  map.clicked = 0
  const municipality = e.target.feature.properties.Concelho
  if (municipality) {
    window.location.href = `/municipio/${encodeURIComponent(municipality.toLowerCase())}/freguesias`
  }
}

map.attributionControl.addAttribution('Carta Administrativa Oficial de Portugal <a href="https://www.dgterritorio.gov.pt/">Direção Geral do Território</a>')
