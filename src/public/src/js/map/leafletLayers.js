
/* global history */

import Cookies from 'js-cookie'

export function setLayers (L, map) {
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  })

  const EsriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  })

  const EsriWorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
  })

  const openTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
  })

  const baseMaps = {
    'ESRI - Imagens de satélite': EsriWorldImagery,
    'ESRI - Mapa do mundo': EsriWorldStreetMap,
    'Open Street Map': osm,
    'Open Topo Map': openTopoMap
  }

  L.control.layers(baseMaps, null, { position: 'bottomright' }).addTo(map)

  let mapLayer
  const urlParams = new URLSearchParams(window.location.search)
  const mapQueryParam = urlParams.get('mapa')
  if (mapQueryParam) {
    if (baseMaps[mapQueryParam]) {
      mapLayer = baseMaps[mapQueryParam]
    } else {
      const mapName = Object.keys(baseMaps)[parseInt(mapQueryParam)]
      if (mapName) {
        mapLayer = baseMaps[mapName]
        setUrlQueryParam(baseMaps, 'mapa', mapName)
      } else {
        mapLayer = osm
        setUrlQueryParam(baseMaps, 'mapa', 'Open Street Map')
      }
    }
  } else if (Cookies.get('mapa') && baseMaps[Cookies.get('mapa')]) {
    const mapName = Cookies.get('mapa')
    mapLayer = baseMaps[mapName]
    setUrlQueryParam(baseMaps, 'mapa', mapName)
  } else {
    mapLayer = osm
    setUrlQueryParam(baseMaps, 'mapa', 'Open Street Map')
  }

  mapLayer.addTo(map)

  map.on('baselayerchange', (e) => {
    // set cookies
    Cookies.set('mapa', e.name)
    // update URL
    setUrlQueryParam(baseMaps, 'mapa', e.name)
  })
}

function setUrlQueryParam (baseMaps, param, value) {
  if ('URLSearchParams' in window) {
    const url = new URL(window.location)
    url.searchParams.set(param, encodeURIComponent(Object.keys(baseMaps).indexOf(value)))
    history.pushState(null, '', url)
  }
}
