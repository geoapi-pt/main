/* global L, fetch, parseGeoraster, GeoRasterLayer */
import '../components.js'

import * as leafletContextmenu from '../map/leafletContextmenu.js'
import { setLayers } from '../map/leafletLayers.js'
import * as mapFunctions from '../map/map-functions.js'
import { mobileCheck } from '../functions.js'

import 'georaster'
import 'georaster-layer-for-leaflet'
import { ColorRampCollection } from '@maptiler/sdk'
import geoblaze from 'geoblaze'

const parishDataDomEl = document.getElementById('parish-altitude-route-data')
const parishData = JSON.parse(decodeURIComponent(parishDataDomEl.dataset.parishroute))
window.parishData = parishData

const codigoine = parishData.codigoine.padStart(6, '0')
const districtCode = codigoine.slice(0, 2)
const municipalityCode = codigoine.slice(2, 4)
const parishCode = codigoine.slice(4, 6)

const map = L.map('map', leafletContextmenu.mapOtions)
leafletContextmenu.setMap(map)
mapFunctions.setMap(map)

const bbox = parishData.geojson.bbox
const corner1 = L.latLng(bbox[1], bbox[0])
const corner2 = L.latLng(bbox[3], bbox[2])
const bounds = L.latLngBounds(corner1, corner2)
map.fitBounds(bounds)

// path /geotiff maps to directory resources/res/altimetria/tif/regions/
const urlToGeoTiff = `/geotiff/parishes/${districtCode}/${municipalityCode}/${parishCode}.tif`

fetch(urlToGeoTiff)
  .then(res => res.arrayBuffer())
  .then(arrayBuffer => {
    parseGeoraster(arrayBuffer).then(georaster => {
      const min = Math.round(georaster.mins[0])
      const max = Math.round(georaster.maxs[0])
      const elevationColor = ColorRampCollection.EARTH.scale(min < 0 ? 0 : min, max)

      setLayers(L, map)

      const layer = new GeoRasterLayer({
        georaster: georaster,
        opacity: 0.8,
        pixelValuesToColorFn: vals => vals[0] && vals[0] >= 0 ? elevationColor.getColorHex(Math.round(vals[0])) : null,
        resolution: 512, // optional parameter for adjusting display resolution
        zIndex: 99
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
