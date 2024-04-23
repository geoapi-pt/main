import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
const meulocalDataDomEl = document.getElementById('meulocal-route-data')
const meulocalData = JSON.parse(decodeURIComponent(meulocalDataDomEl.dataset.meulocalroute))
window.gpsData = meulocalData

navigator.geolocation.getCurrentPosition(res => {
  if (res) {
    const lat = res.coords.latitude
    const lon = res.coords.longitude

    window.location.href = `/gps/${lat},${lon}`
  } else {
    window.alert('Por favor autorize a obtenção da localização no seu navegador')
  }
})
