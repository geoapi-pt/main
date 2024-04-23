/* global fetch, Option */
import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
// select
const selectDistrict = document.getElementById('select-district')
// buttons
const btnGetDistrictInfo = document.getElementById('get-district-info-button')
const btnGetDistrictMunicipalities = document.getElementById('get-district-municipalities-button')
const btnGetDistrictParishes = document.getElementById('get-district-parishes-button')
const btnGetDistrictAltimetry = document.getElementById('get-district-altimetry-button')

selectDistrict.addEventListener('change', () => {
  if (selectDistrict.value && selectDistrict.value !== '0') {
    btnGetDistrictInfo.disabled = false
    btnGetDistrictMunicipalities.disabled = false
    btnGetDistrictParishes.disabled = false
    btnGetDistrictAltimetry.disabled = false
  } else {
    btnGetDistrictInfo.disabled = true
    btnGetDistrictMunicipalities.disabled = true
    btnGetDistrictParishes.disabled = true
    btnGetDistrictAltimetry.disabled = true
  }
})

btnGetDistrictInfo.addEventListener('click', () => {
  if (selectDistrict.value && selectDistrict.value !== '0') {
    window.location.href = `/distrito/${encodeName(selectDistrict.value)}`
  }
})

btnGetDistrictMunicipalities.addEventListener('click', () => {
  if (selectDistrict.value && selectDistrict.value !== '0') {
    window.location.href = `/distrito/${encodeName(selectDistrict.value)}/municipios`
  }
})

btnGetDistrictParishes.addEventListener('click', () => {
  if (selectDistrict.value && selectDistrict.value !== '0') {
    window.location.href = `/distrito/${encodeName(selectDistrict.value)}/freguesias`
  }
})

btnGetDistrictAltimetry.addEventListener('click', () => {
  if (selectDistrict.value && selectDistrict.value !== '0') {
    window.location.href = `/distrito/${encodeName(selectDistrict.value)}/altimetria`
  }
})

fetch('/distritos/base?json=1').then(res => res.json())
  .then((distritos) => {
    distritos.forEach(el => {
      selectDistrict.options.add(new Option(el, el))
    })
  })
  .catch((err) => {
    console.error('error fetching distritos', err)
  })

function encodeName (str) {
  return encodeURIComponent(str.toLowerCase())
}
