/* global L */
import '../components-map.js'

import * as leafletContextmenu from '../map/leafletContextmenu.js'
import { setLayers } from '../map/leafletLayers.js'
import { mobileCheck } from '../functions.js'
import * as mapFunctions from '../map/map-functions.js'

const districtParishesDataDomEl = document.getElementById('district-parishes-route-data')
const districtParishesData = JSON.parse(decodeURIComponent(districtParishesDataDomEl.dataset.districtparishesroute))
window.districtParishesData = districtParishesData

const geojsons = districtParishesData.geojsons
console.log('geojsons:', geojsons)

const parishesGeoJsonFeatureCollection = mapFunctions.getGeojsonFeatureCollection(geojsons.freguesias)

const map = L.map('map', leafletContextmenu.mapOtions)
leafletContextmenu.setMap(map)
mapFunctions.setMap(map)

setLayers(L, map)

// control that shows state info on hover
const info = L.control()

info.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info')
  this.update()
  return this._div
}

info.update = function (props) {
  let contents = '<h4>Freguesias</h4>'
  if (props) {
    contents += `<b>${props.Freguesia}</b><br>${props.Area_T_ha} hectares`
  } else {
    if (mobileCheck()) {
      contents += 'Toque numa freguesia ou faça-lhe duplo toque.<br>Pressione longamente num ponto do mapa para mais opções.'
    } else {
      contents += '<b>Mova o rato sobre uma freguesia ou faça-lhe (duplo)clique.<br>Clique no botão direito do rato num ponto do mapa para mais opções.</b>'
    }
  }

  this._div.innerHTML = contents
}

info.addTo(map)

const geojsonLayer = L.geoJson(parishesGeoJsonFeatureCollection, {
  style: mapFunctions.style,
  onEachFeature
}).addTo(map)

map.fitBounds(geojsonLayer.getBounds())

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
  const parish = e.target.feature.properties.Freguesia
  const municipality = e.target.feature.properties.Concelho
  if (parish && municipality) {
    window.location.href =
      `/municipio/${encodeURIComponent(municipality.toLowerCase())}/freguesia/${encodeURIComponent(parish.toLowerCase())}`
  }
}

map.attributionControl.addAttribution('Carta Administrativa Oficial de Portugal <a href="https://www.dgterritorio.gov.pt/">Direção Geral do Território</a>')
