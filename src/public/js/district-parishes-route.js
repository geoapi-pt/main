/* global L */

const districtParishesDataDomEl = document.getElementById('district-parishes-route-data')
const districtParishesData = JSON.parse(decodeURIComponent(districtParishesDataDomEl.dataset.districtparishesroute))
window.districtParishesData = districtParishesData

const geojsons = districtParishesData.geojsons
console.log('geojsons:', geojsons)

const parishesGeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: geojsons.freguesias
}

// need this for color pallete
const numberOfParishes = parishesGeoJsonFeatureCollection.features.length
parishesGeoJsonFeatureCollection.features.forEach((parish, index) => {
  parish.properties.index = index
})

const centros = geojsons.distrito.properties.centros
const centro = centros.centro

const map = L.map('map').setView([centro[1], centro[0]], 16)

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
  const contents = props ? `<b>${props.Freguesia}</b><br />${props.Area_T_ha} hectares` : 'Mova o rato sobre uma freguesia'
  this._div.innerHTML = `<h4>Freguesias</h4>${contents}`
}

info.addTo(map)

function style (feature) {
  return {
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7,
    fillColor: getColor(feature.properties.index, numberOfParishes)
  }
}

function highlightFeature (e) {
  const layer = e.target

  layer.setStyle({
    weight: 5,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.7
  })

  layer.bringToFront()

  info.update(layer.feature.properties)
}

const geojson = L.geoJson(parishesGeoJsonFeatureCollection, {
  style,
  onEachFeature
}).addTo(map)

function resetHighlight (e) {
  geojson.resetStyle(e.target)
  info.update()
}

function zoomToFeature (e) {
  map.fitBounds(e.target.getBounds())
}

function forwardToPage (e) {
  const parish = e.target.feature.properties.Freguesia
  const municipality = e.target.feature.properties.Concelho
  if (parish && municipality) {
    window.location.href =
      `/municipio/${encodeURIComponent(municipality.toLowerCase())}/freguesia/${encodeURIComponent(parish.toLowerCase())}`
  }
}

function onEachFeature (feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature,
    dblclick: forwardToPage
  })
}

map.attributionControl.addAttribution('Carta Administrativa Oficial de Portugal <a href="https://www.dgterritorio.gov.pt/">Direção Geral do Território</a>')

function getColor (index, size) {
  const colors = {
    3: ['#8dd3c7', '#ffffb3', '#bebada'],
    4: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072'],
    5: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3'],
    6: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462'],
    7: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69'],
    8: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5'],
    9: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9'],
    10: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd'],
    11: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5'],
    12: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f']
  }

  if (size < 3) {
    return colors[3][index]
  } else if (size <= 12) {
    return colors[size][index]
  } else {
    return colors[12][index % 12]
  }
}
