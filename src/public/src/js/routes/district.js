/* global L */
import '../components-map.js'

import * as leafletContextmenu from '../map/leafletContextmenu.js'
import { setLayers } from '../map/leafletLayers.js'
import * as mapFunctions from '../map/map-functions.js'

const districtDataDomEl = document.getElementById('district-route-data')
const districtData = JSON.parse(decodeURIComponent(districtDataDomEl.dataset.districtroute))
window.districtData = districtData

console.log('geojsons:', districtData.geojson)

const map = L.map('map', leafletContextmenu.mapOtions)
leafletContextmenu.setMap(map)
mapFunctions.setMap(map)

const centros = districtData.geojson.properties.centros
if (centros) {
  const centro = centros.centro;

  (new L.Marker([centro[1], centro[0]]))
    .addTo(map)
    .bindPopup('Centro. O centro encontra o centro simples de um conjunto de dados, ao encontrar o ponto médio entre as extensões dos dados. Ou seja, divide em metade o ponto mais a leste e o ponto mais a oeste, bem como o ponto mais a norte e o ponto mais a sul.');

  (new L.Marker([centros.centroide[1], centros.centroide[0]]))
    .addTo(map)
    .bindPopup('Centróide. O centróide é calculado utilizando a média geométrica de todos os vértices.');

  (new L.Marker([centros.centroDeMassa[1], centros.centroDeMassa[0]]))
    .addTo(map)
    .bindPopup('Centro de Massa. O centro da massa imagina que o conjunto de dados é uma folha de papel. O centro da massa é onde a folha se equilibra na ponta de um dedo.');

  (new L.Marker([centros.centroMediano[1], centros.centroMediano[0]]))
    .addTo(map)
    .bindPopup('Centro mediano. O centro mediano toma o centro médio e tenta encontrar, iterativamente, um novo ponto que requer o menor número de viagens de todos os pontos do conjunto de dados. Não é tão sensível a outliers como o centro, mas é atraído por dados agrupados. Também pode ser ponderado.');

  (new L.Marker([centros.centroMedio[1], centros.centroMedio[0]]))
    .addTo(map)
    .bindPopup('Centro médio.')
}

setLayers(L, map)

const geoJSON = L.geoJSON(districtData.geojson, {
  style: {
    stroke: true,
    color: '#9933ff',
    weight: 2,
    opacity: 0.7,
    fill: true,
    fillColor: '#7300e6',
    fillOpacity: 0.15,
    smoothFactor: 0.5,
    interactive: false
  }
}).addTo(map)

map.fitBounds(geoJSON.getBounds())
