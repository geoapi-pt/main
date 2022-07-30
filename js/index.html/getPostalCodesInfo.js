/* global fetch */

const geoApiUrl = 'https://geoapi.pt'

const inputCodigoPostal = document.getElementById('codigo-postal')

inputCodigoPostal.addEventListener('input', () => {
  if (!isPostalCodeOK(inputCodigoPostal.value)) {
    inputCodigoPostal.classList.add('border-danger')
  } else {
    inputCodigoPostal.classList.remove('border-danger')
    fetch(`${geoApiUrl}/cp/${inputCodigoPostal.value}?json=1`)
      .then(res => res.json())
      .then((cpResults) => {
        let html = ''

        if (Array.isArray(cpResults)) {
          cpResults.forEach((res, idx, array) => {
            for (const el in res) {
              html += `<tr><th>${el}</th><td>${res[el]}</td></tr>`
            }
            if (idx !== array.length - 1) {
              html += '<tr><th>-----</th><td>-----</td></tr>'
            }
          })
        } else {
          for (const el in cpResults) {
            html += `<tr><th>${el}</th><td>${cpResults[el]}</td></tr>`
          }
        }

        document.getElementById('result').innerHTML = html
      })
      .catch((err) => {
        console.error('error fetching códigos postais', err)
      })
  }
})

function isPostalCodeOK (postalCodeStr_) {
  let postalCodeStr = postalCodeStr_.trim()

  if (postalCodeStr.length !== 8) {
    return false
  }

  postalCodeStr = postalCodeStr.replace(/\u2013|\u2014/g, '-') // it replaces all &ndash; (–) and &mdash; (—) symbols with simple dashes (-)

  // regex format for 0000-000 or 0000 000
  // http://stackoverflow.com/questions/2577236/regex-for-zip-code
  if (postalCodeStr.match(/^\d{4}(?:[-\s]\d{3})?$/)) {
    return true
  } else {
    return false
  }
}
