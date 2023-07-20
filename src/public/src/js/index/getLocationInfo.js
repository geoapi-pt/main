// inputs
const inputLatitudeGps = document.getElementById('latitude-gps-input')
const inputLongitudeGps = document.getElementById('longitude-gps-input')
// buttons
const btnGetLocationInfo = document.getElementById('get-location-info-button')

inputLatitudeGps.addEventListener('input', () => {
  if (!isInputAValidNumber(inputLatitudeGps)) {
    inputLatitudeGps.classList.add('border-danger')
    btnGetLocationInfo.disabled = true
  } else {
    inputLatitudeGps.classList.remove('border-danger')
    if (isInputAValidNumber(inputLongitudeGps)) {
      btnGetLocationInfo.disabled = false
    }
  }
})

inputLongitudeGps.addEventListener('input', () => {
  if (!isInputAValidNumber(inputLongitudeGps)) {
    inputLongitudeGps.classList.add('border-danger')
    btnGetLocationInfo.disabled = true
  } else {
    inputLongitudeGps.classList.remove('border-danger')
    if (isInputAValidNumber(inputLatitudeGps)) {
      btnGetLocationInfo.disabled = false
    }
  }
})

btnGetLocationInfo.addEventListener('click', () => {
  if (isInputAValidNumber(inputLatitudeGps) && isInputAValidNumber(inputLongitudeGps)) {
    window.location.href = `/gps/${inputLatitudeGps.value},${inputLongitudeGps.value}`
  }
})

function isInputAValidNumber (input) {
  const value = input.value
  return value !== '' && !isNaN(value)
}
