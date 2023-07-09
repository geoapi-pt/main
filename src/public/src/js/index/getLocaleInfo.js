// inputs
const inputLatitudeGps = document.getElementById('latitude-gps-input')
const inputLongitudeGps = document.getElementById('longitude-gps-input')
// buttons
const btnGetLocaleInfo = document.getElementById('get-locale-info-button')

inputLatitudeGps.addEventListener('input', () => {
  if (!isInputAValidNumber(inputLatitudeGps)) {
    inputLatitudeGps.classList.add('border-danger')
  } else {
    inputLatitudeGps.classList.remove('border-danger')
  }
})

inputLongitudeGps.addEventListener('input', () => {
  if (!isInputAValidNumber(inputLongitudeGps)) {
    inputLongitudeGps.classList.add('border-danger')
  } else {
    inputLongitudeGps.classList.remove('border-danger')
  }
})

btnGetLocaleInfo.addEventListener('click', () => {
  if (isInputAValidNumber(inputLatitudeGps) && isInputAValidNumber(inputLongitudeGps)) {
    window.location.href = `/gps/${inputLatitudeGps.value},${inputLongitudeGps.value}`
  }
})

function isInputAValidNumber (input) {
  const value = input.value
  return value !== '' && !isNaN(value)
}
