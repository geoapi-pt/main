/* global L */

const postcodeDataDomEl = document.getElementById('postcode-data')
const postcodeData = JSON.parse(decodeURIComponent(postcodeDataDomEl.dataset.postcode))
window.postcodeData = postcodeData

const map = L.map('map').setView(postcodeData.centro, 15)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

['centro', 'centroide', 'centroDeMassa'].forEach(el => {
  if (postcodeData[el]) {
    const elMap = L.marker(postcodeData[el]).addTo(map)
    elMap.bindPopup(el)
  }
})

if (
  postcodeData.poligono &&
  postcodeData.poligono.features &&
  postcodeData.poligono.features[0] &&
  postcodeData.poligono.features[0].geometry &&
  postcodeData.poligono.features[0].geometry.coordinates &&
  postcodeData.poligono.features[0].geometry.coordinates[0]
) {
  L.polygon(postcodeData.poligono.features[0].geometry.coordinates[0]).addTo(map)
}

postcodeData.pontos
  .forEach(el => {
    const ponto = L.circle(el.coordenadas, {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      radius: 10
    }).addTo(map)
    ponto.bindPopup(`${el.rua}${el.casa ? ', ' + el.casa : ''}`)
  })
