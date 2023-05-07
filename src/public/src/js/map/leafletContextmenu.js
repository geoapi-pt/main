/* global fetch */

let map

export function setMap (_map) {
  map = _map
}

export const mapOtions = {
  contextmenu: true,
  contextmenuWidth: 200,
  contextmenuItems: [{
    text: 'Detalhes deste local',
    callback: showDetails
  }, '-', {
    text: 'Subsecção deste local',
    callback: forwardToSubsection
  }, {
    text: 'Secção deste local',
    callback: forwardToSection
  }, {
    text: 'Freguesia deste local',
    callback: forwardToParish
  }, {
    text: 'Município deste local',
    callback: forwardToMunicipality
  }, {
    text: 'Distrito deste local',
    callback: forwardToDistrict
  }, '-', {
    text: 'Centrar mapa aqui',
    callback: centerMap
  }, '-', {
    text: 'Aproximar',
    icon: '/img/zoom-in.png',
    callback: zoomIn
  }, {
    text: 'Afastar',
    icon: '/img/zoom-out.png',
    callback: zoomOut
  }],
  zoomControl: true
}

function showDetails (e) {
  const lat = e.latlng.lat
  const lon = e.latlng.lng
  window.location.href = `/gps/${lat},${lon}`
}

function centerMap (e) {
  map.panTo(e.latlng)
}

function zoomIn (e) {
  map.zoomIn()
}

function zoomOut (e) {
  map.zoomOut()
}

function forwardToSubsection (e) {
  fetchDetailsOfLocal(e)
    .then(res => {
      console.log('res: ', res)
      window.location.href =
      `/municipio/${encodeStr(res.concelho)}/freguesia/${encodeStr(res.freguesia)}/sec/${encodeStr(res.SEC)}/ss/${encodeStr(res.SS)}`
    })
    .catch(err => {
      console.error(err)
    })
}

function forwardToSection (e) {
  fetchDetailsOfLocal(e)
    .then(res => {
      console.log('res: ', res)
      window.location.href =
        `/municipio/${encodeStr(res.concelho)}/freguesia/${encodeStr(res.freguesia)}/sec/${encodeStr(res.SEC)}`
    })
    .catch(err => {
      console.error(err)
    })
}

function forwardToParish (e) {
  fetchDetailsOfLocal(e)
    .then(res => {
      console.log('res: ', res)
      window.location.href =
        `/municipio/${encodeStr(res.concelho)}/freguesia/${encodeStr(res.freguesia)}`
    })
    .catch(err => {
      console.error(err)
    })
}

function forwardToMunicipality (e) {
  fetchDetailsOfLocal(e)
    .then(res => {
      console.log('res: ', res)
      window.location.href = `/municipio/${encodeStr(res.concelho)}`
    })
    .catch(err => {
      console.error(err)
    })
}

function forwardToDistrict (e) {
  fetchDetailsOfLocal(e)
    .then(res => {
      console.log('res: ', res)
      window.location.href = `/distrito/${encodeStr(res.distrito)}`
    })
    .catch(err => {
      console.error(err)
    })
}

function fetchDetailsOfLocal (e) {
  const lat = e.latlng.lat
  const lon = e.latlng.lng

  return new Promise((resolve, reject) => {
    fetch(`/gps/${lat},${lon}`, {
      headers: {
        Accept: 'application/json'
      }
    })
      .then(res => res.json())
      .then(res => {
        resolve(res)
      })
      .catch(err => {
        reject(err)
      })
  })
}

function encodeStr (str) {
  return encodeURIComponent(str.toLowerCase())
}
