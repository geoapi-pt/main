/* global L */

const indexDataDomEl = document.getElementById('index-route-data')
const indexData = JSON.parse(decodeURIComponent(indexDataDomEl.dataset.indexroute))
window.indexData = indexData
console.log('indexData:', indexData)

// when the map width is below this value, does not show info labels
const showInfoWidthThreshold = 500
const mapWidth = document.getElementById('map').offsetWidth

const districtsGeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: indexData.districts.filter(d => d.geojson).map(d => {
    const geojson = d.geojson
    Object.keys(d).forEach(key => {
      if (key.startsWith('censos')) {
        geojson.properties[key] = d[key]
      }
    })
    return geojson
  })
}

console.log(districtsGeoJsonFeatureCollection)

// need this for color pallete
const numberOfDistricts = districtsGeoJsonFeatureCollection.features.length
districtsGeoJsonFeatureCollection.features.forEach((district, index) => {
  district.properties.index = index
})

const map = L.map('map')

const bbox = indexData.bbox
console.log('bbox', bbox)
// slighlty shift the map to the left, for info label to be shown
const corner1 = L.latLng(bbox[1], bbox[0])
const corner2 = L.latLng(
  bbox[3],
  mapWidth < showInfoWidthThreshold ? bbox[2] : bbox[2] - 0.8 * (bbox[0] - bbox[2])
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
    if (mapWidth > showInfoWidthThreshold) {
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
    contents = '<h4>Distritos</h4>Mova o rato sobre um distrito ou faça-lhe (duplo)clique'
  }
  this._div.innerHTML = `${contents}`
}

info.addTo(map)

function style (feature) {
  return {
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7,
    fillColor: getColor(feature.properties.index, numberOfDistricts)
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

const geojson = L.geoJson(districtsGeoJsonFeatureCollection, {
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
  const distrito = e.target.feature.properties.Distrito
  if (distrito) {
    window.location.href = `/distrito/${encodeURIComponent(distrito.toLowerCase())}/municipios`
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
