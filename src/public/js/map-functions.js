/* global topojson */

const colors = ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f']

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

  const topoJSON = topojson.topology([geoJsonFeatureCollection], 1e4)
  const neighbors = topojson.neighbors(topoJSON.objects[0].geometries)

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
