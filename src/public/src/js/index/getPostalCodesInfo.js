/* global fetch */
const inputCodigoPostal = document.getElementById('postal-code-input')
const getPostalCodeInfoBtn = document.getElementById('get-postal-code-info-button')

let arrayOfcp7 // array with all the CP7s
fetch('/codigos_postais/base?json=1')
  .then(r => r.json())
  .then(res => {
    arrayOfcp7 = res
  })

inputCodigoPostal.addEventListener('input', () => {
  inputCodigoPostal.value = inputCodigoPostal.value.replace(/[^\d\s\p{Dash}]/ug, '')

  if (isPostalCodeOK(inputCodigoPostal.value) && arrayOfcp7.includes(inputCodigoPostal.value)) {
    inputCodigoPostal.classList.remove('border-danger')
    inputCodigoPostal.classList.add('border-success')
    getPostalCodeInfoBtn.disabled = false
  } else {
    inputCodigoPostal.classList.remove('border-success')
    inputCodigoPostal.classList.add('border-danger')
    getPostalCodeInfoBtn.disabled = true
  }
})

getPostalCodeInfoBtn.addEventListener('click', () => {
  inputCodigoPostal.value = inputCodigoPostal.value.replace(/[^\d\s\p{Dash}]/ug, '')

  if (isPostalCodeOK(inputCodigoPostal.value)) {
    window.location.href = `/codigo_postal/${inputCodigoPostal.value}`
  }
})

function isPostalCodeOK (postalCodeStr_) {
  let postalCodeStr = postalCodeStr_.trim()

  if (postalCodeStr.length !== 8 && postalCodeStr.length !== 4) {
    return false
  }

  postalCodeStr = postalCodeStr.replace(/\u2013|\u2014/g, '-') // it replaces all &ndash; (–) and &mdash; (—) symbols with simple dashes (-)

  // regex format for 0000-000 or 0000 000
  // http://stackoverflow.com/questions/2577236/regex-for-zip-code
  if (postalCodeStr.match(/^\d{4}(?:[-\s]\d{3})?$/g)) {
    return true
  } else {
    return false
  }
}
