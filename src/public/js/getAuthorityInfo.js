/* global fetch, location, Option, Event */

(() => {
  // replace by 'https://geoapi.pt' if you're not running your own API
  const geoApiOrigin = location.origin

  const selectMunicipality = document.getElementById('select-municipio')
  const selectFreguesia = document.getElementById('select-freguesia')

  selectMunicipality.addEventListener('change', () => {
    fetch(`${geoApiOrigin}/municipio/${selectMunicipality.value}/freguesias?json=1`).then(res => res.json())
      .then((res) => {
        // clean select
        const length = selectFreguesia.options.length
        for (let i = length - 1; i >= 0; i--) {
          selectFreguesia.options[i] = null
        }

        res.freguesias.forEach(el => {
          selectFreguesia.options.add(new Option(el, el))
        })
      })
      .catch((err) => {
        console.error('error fetching freguesias', err)
      })
  })

  selectFreguesia.addEventListener('click', () => {
    window.location.href = `/municipio/${selectMunicipality.value}/freguesia/${selectFreguesia.value}`
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
