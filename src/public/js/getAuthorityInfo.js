/* global fetch, Option, Event */

(() => {
  const geoApiUrl = 'https://geoapi.pt'

  const selectMunicipality = document.getElementById('select-municipio')
  const selectFreguesia = document.getElementById('select-freguesia')

  selectMunicipality.addEventListener('change', () => {
    fetch(`${geoApiUrl}/municipios/${selectMunicipality.value}/freguesias?json=1`).then(res => res.json())
      .then((res) => {
        // clean select
        const length = selectFreguesia.options.length
        for (let i = length - 1; i >= 0; i--) {
          selectFreguesia.options[i] = null
        }

        res.freguesias.forEach(el => {
          selectFreguesia.options.add(new Option(el, el))
        })

        selectFreguesia.dispatchEvent(new Event('change'))
      })
      .catch((err) => {
        console.error('error fetching freguesias', err)
      })
  })

  selectFreguesia.addEventListener('change', () => {
    fetch(`${geoApiUrl}/freguesia/${selectFreguesia.value}?municipio=${selectMunicipality.value}&json=1`).then(res => res.json())
      .then((res) => {
        const result = document.getElementById('result-freguesia')
        result.innerHTML = ''
        for (const el in res) {
          result.innerHTML += `<tr><th>${el}</th><td>${res[el]}</td></tr>`
        }
      })
      .catch((err) => {
        console.error('error fetching freguesias', err)
      })
  })

  fetch(`${geoApiUrl}/municipios?json=1`).then(res => res.json())
    .then((municipios) => {
      municipios.forEach(el => {
        selectMunicipality.options.add(new Option(el, el))
      })

      selectMunicipality.dispatchEvent(new Event('change'))
    })
    .catch((err) => {
      console.error('error fetching municipios', err)
    })
})()
