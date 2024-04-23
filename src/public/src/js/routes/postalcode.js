/* global L */
import '../components.js'

import * as leafletContextmenu from '../map/leafletContextmenu.js'
import * as mapFunctions from '../map/map-functions.js'

const postcodeDataDomEl = document.getElementById('postcode-data')
const postcodeData = JSON.parse(decodeURIComponent(postcodeDataDomEl.dataset.postcode))
window.postcodeData = postcodeData

console.log('postcodeData:', postcodeData)

if (
  Array.isArray(postcodeData.centro) && postcodeData.centro.length === 2 &&
  Array.isArray(postcodeData.pontos) && postcodeData.pontos.length
) {
  const map = L.map('map', leafletContextmenu.mapOtions).setView(postcodeData.centro, 11)
  leafletContextmenu.setMap(map)
  mapFunctions.setMap(map)

  if (postcodeData.poligono) {
    const lats = postcodeData.poligono.map(el => el[0])
    const lons = postcodeData.poligono.map(el => el[1])
    map.fitBounds([
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    ], { padding: [30, 30] })
  } else if (postcodeData.pontos && postcodeData.pontos.length > 1) {
    const lats = postcodeData.pontos.map(el => el.coordenadas[0])
    const lons = postcodeData.pontos.map(el => el.coordenadas[1])
    map.fitBounds([
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    ], { padding: [30, 30] })
  }

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
    L.polygon(postcodeData.poligono, { interactive: false }).addTo(map)
  }

  postcodeData.pontos
    .forEach(el => {
      const ponto = L.circle(el.coordenadas, {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: 2,
        interactive: el.rua || el.casa
      }).addTo(map)

      if (el.rua) {
        ponto.bindPopup(`${el.rua}${el.casa ? ', ' + el.casa : ''}`)
      } else if (el.casa) {
        ponto.bindPopup(el.casa)
      }
    })
} else {
  const mapEl = document.getElementsByClassName('map-div')
  mapEl[0].style.display = 'none'
}
