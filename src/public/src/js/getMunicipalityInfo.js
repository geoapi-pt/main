/* global fetch, Option */

// select
const selectMunicipality = document.getElementById('select-municipality-info')
// buttons
const btnGetMunicipalityInfo = document.getElementById('get-municipality-info-button')
const btnGetMunicipalityParishes = document.getElementById('get-municipality-parishes-button')

btnGetMunicipalityInfo.addEventListener('click', () => {
  if (selectMunicipality.value && selectMunicipality.value !== '0') {
    window.location.href = `/municipios/${encodeURIComponent(selectMunicipality.value)}`
  }
})

btnGetMunicipalityParishes.addEventListener('click', () => {
  if (selectMunicipality.value && selectMunicipality.value !== '0') {
    window.location.href = `/municipios/${encodeURIComponent(selectMunicipality.value)}/freguesias`
  }
})

fetch('/municipios?json=1').then(res => res.json())
  .then((municipios) => {
    selectMunicipality.options.add(new Option('[selecione]', ''))
    municipios.forEach(el => {
      selectMunicipality.options.add(new Option(el, el))
    })
  })
  .catch((err) => {
    console.error('error fetching municipios', err)
  })
