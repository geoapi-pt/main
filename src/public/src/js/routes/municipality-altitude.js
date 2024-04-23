/* global L, fetch, parseGeoraster, GeoRasterLayer */
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import * as leafletContextmenu from '../map/leafletContextmenu.js'
import * as mapFunctions from '../map/map-functions.js'
import { mobileCheck } from '../functions.js'

import 'georaster'
import 'georaster-layer-for-leaflet'
import { ColorRampCollection } from '@maptiler/sdk'
import geoblaze from 'geoblaze'

const municipalityDataDomEl = document.getElementById('municipality-altitude-route-data')
const municipalityData = JSON.parse(decodeURIComponent(municipalityDataDomEl.dataset.municipalityroute))
window.municipalityData = municipalityData

const map = L.map('map', leafletContextmenu.mapOtions)
leafletContextmenu.setMap(map)
mapFunctions.setMap(map)

const bbox = municipalityData.geojson.bbox
const corner1 = L.latLng(bbox[1], bbox[0])
const corner2 = L.latLng(bbox[3], bbox[2])
const bounds = L.latLngBounds(corner1, corner2)
map.fitBounds(bounds)

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap | <a href="https://spacedata.copernicus.eu/">Copernicus DEM</a>'
}).addTo(map)

// path /geotiff maps to directory resources/res/altimetria/tif/regions/
const urlToGeoTiff = `/geotiff/municipalities/${municipalityData.codigoine.padStart(4, 0)}.tif`

fetch(urlToGeoTiff)
  .then(res => res.arrayBuffer())
  .then(arrayBuffer => {
    parseGeoraster(arrayBuffer).then(georaster => {
      const min = Math.round(georaster.mins[0])
      const max = Math.round(georaster.maxs[0])
      const elevationColor = ColorRampCollection.EARTH.scale(min < 0 ? 0 : min, max)

      const layer = new GeoRasterLayer({
        georaster: georaster,
        opacity: 0.8,
        pixelValuesToColorFn: vals => vals[0] && vals[0] >= 0 ? elevationColor.getColorHex(Math.round(vals[0])) : null,
        resolution: 512 // optional parameter for adjusting display resolution
      }).addTo(map)

      map.fitBounds(layer.getBounds())

      map.on('mousemove', evt => {
        const lat = evt.latlng.lat
        const lng = evt.latlng.lng
        const rasterPointData = geoblaze.identify(georaster, [lng, lat])
        const altitude = rasterPointData ? Math.round(rasterPointData[0]) : null
        info.update(altitude)
      })

      // control that shows altitude on hovering the map
      const info = L.control()

      info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info')
        this.update()
        return this._div
      }

      info.update = function (altitude) {
        let contents = ''
        if (altitude && altitude >= 0) {
          contents += `<h2><b>${altitude} metros</b></h2>`
        } else {
          if (mobileCheck()) {
            contents += 'Toque numa região colorida para obter a altitude.<br>Pressione longamente num ponto do mapa para mais opções.'
          } else {
            contents += '<b>Mova o rato sobre a região colorida para obter a altitude.<br>Clique no botão direito do rato num ponto do mapa para mais opções.</b>'
          }
        }

        this._div.innerHTML = contents
      }

      info.addTo(map)
    })
  })
