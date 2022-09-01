/* global L */

const postcodeDataDomEl = document.getElementById('postcode-data')
const postcodeData = JSON.parse(decodeURIComponent(postcodeDataDomEl.dataset.postcode))
window.postcodeData = postcodeData

const map = L.map('map').setView(postcodeData.centro, 11)

const lats = postcodeData.poligono.map(el => el[0])
const lons = postcodeData.poligono.map(el => el[1])
map.fitBounds([
  [Math.min(...lats), Math.min(...lons)],
  [Math.max(...lats), Math.max(...lons)]
], { padding: [30, 30] })

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

['centroide', 'centroDeMassa', 'centro'].forEach(el => {
  if (postcodeData[el]) {
    const elMap = L.marker(postcodeData[el]).addTo(map)
    elMap.bindPopup(el)
  }
})

if (postcodeData.poligono) {
  L.polygon(postcodeData.poligono).addTo(map)
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
