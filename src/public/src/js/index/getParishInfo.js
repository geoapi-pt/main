/* global fetch, Option */
import 'bootstrap'
// selects
const selectMunicipality = document.getElementById('select-municipality-on-parish-info')
const selectFreguesia = document.getElementById('select-parish-on-parish-info')
// buttons
const btnGetParishesInfo = document.getElementById('get-parish-info-button')
const btnGetParishesSections = document.getElementById('get-parish-sections-button')
const btnGetParishesSubsections = document.getElementById('get-parish-subsections-button')
const btnGetParishesAltimetry = document.getElementById('get-parish-altimetry-button')

selectMunicipality.addEventListener('change', () => {
  // Clean list of parishes (except the 0th item, "Select...")
  const length = selectFreguesia.options.length
  for (let i = length - 1; i > 0; i--) {
    selectFreguesia.remove(i)
  }

  if (selectMunicipality.value && selectMunicipality.value !== '0') {
    fetch(`/municipio/${encodeURIComponent(selectMunicipality.value)}/freguesias?json=1`)
      .then(res => res.json())
      .then((res) => {
        res.freguesias.forEach(el => {
          selectFreguesia.options.add(new Option(el, el))
        })

        selectFreguesia.disabled = false
      })
      .catch((err) => {
        console.error('error fetching freguesias', err)
      })
  } else {
    selectFreguesia.disabled = true
    btnGetParishesInfo.disabled = true
    btnGetParishesSections.disabled = true
    btnGetParishesSubsections.disabled = true
    btnGetParishesAltimetry.disabled = true
  }
})

selectFreguesia.addEventListener('change', () => {
  if (areBothSelectsSelected()) {
    btnGetParishesInfo.disabled = false
    btnGetParishesSections.disabled = false
    btnGetParishesSubsections.disabled = false
    btnGetParishesAltimetry.disabled = false
  } else {
    btnGetParishesInfo.disabled = true
    btnGetParishesSections.disabled = true
    btnGetParishesSubsections.disabled = true
    btnGetParishesAltimetry.disabled = true
  }
})

btnGetParishesInfo.addEventListener('click', () => {
  if (areBothSelectsSelected()) {
    window.location.href = `/municipio/${encodeURIComponent(selectMunicipality.value)}/freguesia/${encodeURIComponent(selectFreguesia.value)}`
  }
})

btnGetParishesSections.addEventListener('click', () => {
  if (areBothSelectsSelected()) {
    window.location.href = `/municipio/${encodeURIComponent(selectMunicipality.value)}/freguesia/${encodeURIComponent(selectFreguesia.value)}/secções`
  }
})

btnGetParishesSubsections.addEventListener('click', () => {
  if (areBothSelectsSelected()) {
    window.location.href = `/municipio/${encodeURIComponent(selectMunicipality.value)}/freguesia/${encodeURIComponent(selectFreguesia.value)}/subsecções`
  }
})

btnGetParishesAltimetry.addEventListener('click', () => {
  if (areBothSelectsSelected()) {
    window.location.href = `/municipio/${encodeURIComponent(selectMunicipality.value)}/freguesia/${encodeURIComponent(selectFreguesia.value)}/altimetria`
  }
})

function areBothSelectsSelected () {
  return selectMunicipality.value &&
    selectMunicipality.value !== '0' &&
    selectFreguesia.value &&
    selectFreguesia.value !== '0'
}

fetch('/municipios?json=1').then(res => res.json())
  .then((municipios) => {
    municipios.forEach(el => {
      selectMunicipality.options.add(new Option(el, el))
    })
  })
  .catch((err) => {
    console.error('error fetching municipios', err)
  })
