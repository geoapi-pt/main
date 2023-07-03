/* global fetch, Option, Event */

const selectMunicipality = document.getElementById('select-municipio')
const selectFreguesia = document.getElementById('select-freguesia')

selectMunicipality.addEventListener('change', () => {
  fetch(`/municipio/${encodeURIComponent(selectMunicipality.value)}/freguesias?json=1`)
    .then(res => res.json())
    .then((res) => {
      // clean select
      const length = selectFreguesia.options.length
      for (let i = length - 1; i >= 0; i--) {
        selectFreguesia.options[i] = null
      }

      selectFreguesia.options.add(new Option('[selecione]', ''))
      res.freguesias.forEach(el => {
        selectFreguesia.options.add(new Option(el, el))
      })
    })
    .catch((err) => {
      console.error('error fetching freguesias', err)
    })
})

selectFreguesia.addEventListener('change', () => {
  if (selectFreguesia.value) {
    window.location.href = `/municipio/${encodeURIComponent(selectMunicipality.value)}/freguesia/${encodeURIComponent(selectFreguesia.value)}`
  }
})

fetch('/municipios?json=1').then(res => res.json())
  .then((municipios) => {
    municipios.forEach(el => {
      selectMunicipality.options.add(new Option(el, el))
    })

    selectMunicipality.dispatchEvent(new Event('change'))
  })
  .catch((err) => {
    console.error('error fetching municipios', err)
  })
