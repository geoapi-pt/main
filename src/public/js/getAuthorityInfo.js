/* global fetch, location, Option, Event */

(() => {
  // replace by 'https://geoapi.pt' if you're not running your own API
  const geoApiOrigin = location.origin

  const selectMunicipality = document.getElementById('select-municipio')
  const selectFreguesia = document.getElementById('select-freguesia')

  selectMunicipality.addEventListener('change', () => {
    fetch(`${geoApiOrigin}/municipios/${selectMunicipality.value}/freguesias?json=1`).then(res => res.json())
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
    fetch(`${geoApiOrigin}/freguesias/${selectFreguesia.value}?municipio=${selectMunicipality.value}&json=1`).then(res => res.json())
      .then((res) => {
        const result = document.getElementById('result-freguesia')
        result.innerHTML = ''
        for (const el in res) {
          result.innerHTML += `<tr><th class="w-50">${el}</th><td class="w-50">${res[el]}</td></tr>`
        }
      })
      .catch((err) => {
        console.error('error fetching freguesias', err)
      })
  })

  fetch(`${geoApiOrigin}/municipios?json=1`).then(res => res.json())
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
