/* global L */

(() => {
  const gpsDataDomEl = document.getElementById('gps-route-data')
  const gpsData = JSON.parse(decodeURIComponent(gpsDataDomEl.dataset.gpsroute))
  window.gpsData = gpsData

  const map = L.map('map').setView([gpsData.lat, gpsData.lon], 16)

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map)

  const marker = new L.Marker([gpsData.lat, gpsData.lon], { draggable: 'true' })
  marker.addTo(map)
  marker.on('dragend', function (event) {
    const marker = event.target
    const position = marker.getLatLng()
    window.location.href = `${position.lat}, ${position.lng}`
  })
})()
