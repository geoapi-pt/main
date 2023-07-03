/* global fetch, Option */

const selectMunicipality = document.getElementById('select-municipality-info')

selectMunicipality.addEventListener('change', () => {
  const option = document.querySelector('input[name="select-municipality-radios"]:checked').value
  switch (option) {
    case 'info':
      window.location.href = `/municipios/${encodeURIComponent(selectMunicipality.value)}`
      break
    case 'parishes':
      window.location.href = `/municipios/${encodeURIComponent(selectMunicipality.value)}/freguesias`
      break
    default:
      throw new Error('unknown option: ' + option)
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
