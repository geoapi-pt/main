/* global L */

import 'leaflet/dist/leaflet'

import * as topojsonServer from 'topojson-server/dist/topojson-server'
import * as topojsonClient from 'topojson-client/dist/topojson-client'

let map

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
})

export function setMap (_map) {
  map = _map
  map.zoomControl.setPosition('bottomleft')
}

// List of distinctive colors provided by ColorBrewer: https://colorbrewer2.org/#type=qualitative&scheme=Set3&n=12
const colors = ['#8dd3c7', '#ffffb3', '#fb8072', '#80b1d3', '#fdb462', '#bebada', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f']

export function style (feature) {
  return {
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7,
    fillColor: colors[feature.properties.colorIndex]
  }
}

export function getGeojsonFeatureCollection (geojsonFeatures) {
  const geoJsonFeatureCollection = {
    type: 'FeatureCollection',
    features: geojsonFeatures
  }

  const topoJSON = topojsonServer.topology([geoJsonFeatureCollection], 1e4)
  const neighbors = topojsonClient.neighbors(topoJSON.objects[0].geometries)

  const featureColors = []
  geoJsonFeatureCollection.features.forEach((parish, index) => {
    let i
    for (i = 0; i < colors.length; i++) {
      let found = false
      for (let j = 0; j < neighbors[index].length; j++) {
        if (featureColors[neighbors[index][j]] === i) {
          found = true
          break
        }
      }
      if (!found) break
    }
    featureColors[index] = i
    parish.properties.colorIndex = i
  })

  return geoJsonFeatureCollection
}

export function getHighlightFeature (info) {
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
  return highlightFeature
}

export function getZoomToFeature (map) {
  function zoomToFeature (e) {
    map.fitBounds(e.target.getBounds())
  }
  return zoomToFeature
}
