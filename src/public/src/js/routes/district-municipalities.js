/* global L */
import '../components-map.js'

import * as leafletContextmenu from '../map/leafletContextmenu.js'
import { setLayers } from '../map/leafletLayers.js'
import { mobileCheck } from '../functions.js'
import * as mapFunctions from '../map/map-functions.js'

const districtMunicipalitiesDataDomEl = document.getElementById('district-municipalities-route-data')
const districtMunicipalitiesData = JSON.parse(decodeURIComponent(districtMunicipalitiesDataDomEl.dataset.districtmunicipalitiesroute))
window.districtMunicipalitiesData = districtMunicipalitiesData

const geojsons = districtMunicipalitiesData.geojsons
console.log('geojsons:', geojsons)

const municipalitiesGeoJsonFeatureCollection = mapFunctions.getGeojsonFeatureCollection(geojsons.municipios)

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
  const municipality = e.target.feature.properties.Concelho
  if (municipality) {
    window.location.href = `/municipio/${encodeURIComponent(municipality.toLowerCase())}/freguesias`
  }
}

map.attributionControl.addAttribution('Carta Administrativa Oficial de Portugal <a href="https://www.dgterritorio.gov.pt/">Direção Geral do Território</a>')
