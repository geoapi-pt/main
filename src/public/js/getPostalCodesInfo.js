/* global fetch, location */
(() => {
  // replace by 'https://geoapi.pt' if you're not running your own API
  const geoApiOrigin = location.origin

  const inputCodigoPostal = document.getElementById('codigo-postal')
  const resultCodigoPostal = document.getElementById('result-codigo-postal')

  inputCodigoPostal.addEventListener('input', () => {
    inputCodigoPostal.value = inputCodigoPostal.value.replace(/[^\d\s\p{Dash}]/ug, '')

    if (!isPostalCodeOK(inputCodigoPostal.value)) {
      inputCodigoPostal.classList.add('border-danger')
    } else {
      inputCodigoPostal.classList.remove('border-danger')
      fetch(`${geoApiOrigin}/cp/${inputCodigoPostal.value}?json=1`)
        .then(res => res.json())
        .then((cpResults) => {
          let html = ''
          for (const el in cpResults) {
            if (el !== 'partes' && el !== 'pontos' && el !== 'poligono') {
              html += `<tr><th>${el}</th>`
              if (el === 'CP' || el === 'CP4') {
                html += `<td class="w-50"><a href="/cp/${cpResults[el]}">${cpResults[el]}</a></td>`
              } else {
                html += `<td class="w-50"${cpResults[el]}</td>`
              }
              html += '</tr>'
            }
          }
          resultCodigoPostal.innerHTML = html
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
})()
