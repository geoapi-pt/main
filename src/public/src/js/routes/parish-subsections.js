/* global L */
import '../components.js'

import * as leafletContextmenu from '../map/leafletContextmenu.js'
import { setLayers } from '../map/leafletLayers.js'
import { mobileCheck } from '../functions.js'
import * as mapFunctions from '../map/map-functions.js'

const parishSubsectionsDataDomEl = document.getElementById('parish-subsections-route-data')
const parishSubsectionsData = JSON.parse(decodeURIComponent(parishSubsectionsDataDomEl.dataset.parishssubectionsroute))
window.parishSubsectionsData = parishSubsectionsData

console.log('parishSubsectionsData:', parishSubsectionsData)

const sectionGeoJsonFeatureCollection = mapFunctions.getGeojsonFeatureCollection(parishSubsectionsData.geojson.features)

const map = L.map('map', leafletContextmenu.mapOtions)
leafletContextmenu.setMap(map)
mapFunctions.setMap(map)

const bbox = parishSubsectionsData.geojson.bbox
const corner1 = L.latLng(bbox[1], bbox[0])
const corner2 = L.latLng(bbox[3], bbox[2])
const bounds = L.latLngBounds(corner1, corner2)
map.fitBounds(bounds)

setLayers(L, map)

// control that shows state info on hover
const info = L.control()

info.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info')
  this.update()
  return this._div
}

info.update = function (props) {
  let contents = '<h4>Subsecções estatísticas</h4>'
  if (props && props.SSNUM21 && props.SECNUM21) {
    contents += `Subsecção <b>${props.SSNUM21}</b>, da secção <b>${props.SECNUM21}</b>`
  } else {
    if (mobileCheck()) {
      contents += 'Toque numa subsecção ou faça-lhe duplo toque.<br>Pressione longamente num ponto do mapa para mais opções.'
    } else {
      contents += '<b>Mova o rato sobre uma subsecção ou faça-lhe (duplo)clique.<br>Clique no botão direito do rato num ponto do mapa para mais opções.</b>'
    }
  }

  this._div.innerHTML = contents
}

info.addTo(map)

const geojsonLayer = L.geoJson(sectionGeoJsonFeatureCollection, {
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
  const municipality = parishSubsectionsData.municipio.nome
  const parish = parishSubsectionsData.freguesia.nome
  const section = e.target.feature.properties.SECNUM21.padStart(3, '0')
  const subsection = e.target.feature.properties.SSNUM21.padStart(2, '0')
  if ([municipality, parish, section, subsection].every(e => typeof e === 'string')) {
    window.location.href =
      `/municipio/${encodeURIComponent(municipality.toLowerCase())}/freguesia/${encodeURIComponent(parish.toLowerCase())}/sec/${section}/ss/${subsection}`
  }
}

map.attributionControl.addAttribution('Carta Administrativa Oficial de Portugal <a href="https://www.dgterritorio.gov.pt/">Direção Geral do Território</a>')
