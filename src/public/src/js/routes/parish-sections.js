/* global L */
import 'bootstrap'
import * as leafletContextmenu from '../map/leafletContextmenu.js'
import { mobileCheck } from '../functions.js'
import * as mapFunctions from '../map/map-functions.js'

const parishSectionsDataDomEl = document.getElementById('parish-sections-route-data')
const parishSectionsData = JSON.parse(decodeURIComponent(parishSectionsDataDomEl.dataset.parishsectionsroute))
window.parishSectionsData = parishSectionsData

console.log('parishSectionsData:', parishSectionsData)

const sectionGeoJsonFeatureCollection = mapFunctions.getGeojsonFeatureCollection(parishSectionsData.geojson.features)

const map = L.map('map', leafletContextmenu.mapOtions)
leafletContextmenu.setMap(map)
mapFunctions.setMap(map)

const bbox = parishSectionsData.geojson.bbox
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
  let contents = '<h4>Secções estatísticas</h4>'
  if (props && props.SECNUM21) {
    contents += `Secção <b>${props.SECNUM21}</b>`
  } else {
    if (mobileCheck()) {
      contents += 'Toque numa secção ou faça-lhe duplo toque.<br>Pressione longamente num ponto do mapa para mais opções.'
    } else {
      contents += '<b>Mova o rato sobre uma secção ou faça-lhe (duplo)clique.<br>Clique no botão direito do rato num ponto do mapa para mais opções.</b>'
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
  const municipality = parishSectionsData.municipio.nome
  const parish = parishSectionsData.freguesia.nome
  const section = e.target.feature.properties.SECNUM21.padStart(3, '0')
  if ([municipality, parish, section].every(e => typeof e === 'string')) {
    window.location.href =
      `/municipio/${encodeURIComponent(municipality.toLowerCase())}/freguesia/${encodeURIComponent(parish.toLowerCase())}/sec/${section}`
  }
}

map.attributionControl.addAttribution('Carta Administrativa Oficial de Portugal <a href="https://www.dgterritorio.gov.pt/">Direção Geral do Território</a>')
