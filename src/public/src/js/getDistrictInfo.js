/* global fetch, Option */

const selectDistrict = document.getElementById('select-district')

selectDistrict.addEventListener('change', () => {
  const option = document.querySelector('input[name="select-district-radios"]:checked').value
  switch (option) {
    case 'info':
      window.location.href = `/distrito/${encodeURIComponent(selectDistrict.value)}`
      break
    case 'municipalities':
      window.location.href = `/distrito/${encodeURIComponent(selectDistrict.value)}/municipios`
      break
    case 'parishes':
      window.location.href = `/distrito/${encodeURIComponent(selectDistrict.value)}/freguesias`
      break
    default:
      throw new Error('unknown option: ' + option)
  }
})

fetch('/distritos?json=1').then(res => res.json())
  .then((distritos) => {
    selectDistrict.options.add(new Option('[selecione]', ''))
    distritos.forEach(el => {
      selectDistrict.options.add(new Option(el.distrito, el.distrito))
    })
  })
  .catch((err) => {
    console.error('error fetching distritos', err)
  })
