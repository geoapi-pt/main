const inputCodigoPostal = document.getElementById('postal-code-input')
const getPostalCodeInfoBtn = document.getElementById('get-postal-code-info-button')

inputCodigoPostal.addEventListener('input', () => {
  inputCodigoPostal.value = inputCodigoPostal.value.replace(/[^\d\s\p{Dash}]/ug, '')

  if (!isPostalCodeOK(inputCodigoPostal.value)) {
    inputCodigoPostal.classList.add('border-danger')
  } else {
    inputCodigoPostal.classList.remove('border-danger')
  }
})

getPostalCodeInfoBtn.addEventListener('click', () => {
  inputCodigoPostal.value = inputCodigoPostal.value.replace(/[^\d\s\p{Dash}]/ug, '')

  if (isPostalCodeOK(inputCodigoPostal.value)) {
    window.location.href = `/cp/${inputCodigoPostal.value}`
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
