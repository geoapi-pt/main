/* global L */

import * as leafletContextmenu from '../map/leafletContextmenu.js'
import { mobileCheck } from '../functions.js'
import * as mapFunctions from '../map/map-functions.js'

const indexDataDomEl = document.getElementById('index-route-data')
const indexData = JSON.parse(decodeURIComponent(indexDataDomEl.dataset.indexroute))
window.indexData = indexData
console.log('indexData:', indexData)

const mapWidth = document.getElementById('map').offsetWidth
const assumeMobile = mapWidth < 500 || mobileCheck()

const geojsonFeatures = indexData.districts.filter(d => d.geojson).map(d => {
  const geojson = d.geojson
  Object.keys(d).forEach(key => {
    if (key.startsWith('censos')) {
      geojson.properties[key] = d[key]
    }
  })
  return geojson
})

const districtsGeoJsonFeatureCollection = mapFunctions.getGeojsonFeatureCollection(geojsonFeatures)

console.log(districtsGeoJsonFeatureCollection)

const map = L.map('map', leafletContextmenu.mapOtions)
leafletContextmenu.setMap(map)
mapFunctions.setMap(map)

const bbox = indexData.bbox
console.log('bbox', bbox)
// slighlty shift the map to the left, for info label to be shown
const corner1 = L.latLng(bbox[1], bbox[0])
const corner2 = L.latLng(
  bbox[3],
  assumeMobile ? bbox[2] : bbox[2] - 0.8 * (bbox[0] - bbox[2])
)
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

info.update = function (properties) {
  let contents
  if (properties) {
    const mapWidth = document.getElementById('map').offsetWidth
    contents = `<b>${properties.Distrito}</b> (${properties.Area_T_ha} hectares)<br/>`
    if (!assumeMobile) {
      contents += '<br/><b>Censos 2021:</b><br/>' +
        `<div class="table-responsive"><table style="max-width:${(0.4 * mapWidth).toFixed(0)}px" class="table table-sm"><tbody>`
      for (const key in properties.censos2021) {
        contents +=
          `<tr><th scope="row">${key}</th>` +
          `<td>${properties.censos2021[key]}</td></tr>`
      }
      contents += '</tbody></table></div>'
    }
  } else {
    if (mobileCheck()) {
      contents = '<h4>Distritos</h4>Toque num distrito ou faça-lhe duplo toque.<br>Pressione longamente num ponto do mapa para mais opções.'
    } else {
      contents = '<h4>Distritos</h4><b>Mova o rato sobre um distrito ou faça-lhe (duplo)clique.<br>Clique no botão direito do rato num ponto do mapa para mais opções.</b>'
    }
  }
  this._div.innerHTML = contents
}

info.addTo(map)

const geojsonLayer = L.geoJson(districtsGeoJsonFeatureCollection, {
  style: mapFunctions.style,
  onEachFeature
}).addTo(map)

function onEachFeature (feature, layer) {
  layer.on({
    mouseover: mapFunctions.getHighlightFeature(info),
    mouseout: resetHighlight,
    click: mapFunctions.getZoomToFeature(map),
    dblclick: forwardToPage
  })
}

function resetHighlight (e) {
  geojsonLayer.resetStyle(e.target)
  info.update()
}

function forwardToPage (e) {
  const distrito = e.target.feature.properties.Distrito
  if (distrito) {
    window.location.href = `/distrito/${encodeURIComponent(distrito.toLowerCase())}/municipios`
  }
}

map.attributionControl.addAttribution('Carta Administrativa Oficial de Portugal <a href="https://www.dgterritorio.gov.pt/">Direção Geral do Território</a>')
