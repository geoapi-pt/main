/* global fetch */

document.addEventListener('DOMContentLoaded', (event) => {
  const requestsLastHourWrap = document.querySelector('.requests-last-hour-wrap')
  const requestsLastDayWrap = document.querySelector('.requests-last-day-wrap')

  fetch('/counters/requestslasthour/')
    .then(res => {
      if (res.ok) {
        return res.json()
      } else {
        requestsLastHourWrap.style.display = 'none'
        throw new Error('Error fetching requestslasthour', res)
      }
    })
    .then(res => {
      requestsLastHourWrap.style.display = 'inline'
      const value = res.message
      document.querySelector('.requests-last-hour').innerHTML = value
    })
    .catch(err => {
      console.error('Error fetching requestslasthour', err)
    })

  fetch('/counters/requestslastday/')
    .then(res => {
      if (res.ok) {
        return res.json()
      } else {
        requestsLastDayWrap.style.display = 'none'
        throw new Error('Error fetching requestslastday', res)
      }
    })
    .then(res => {
      requestsLastDayWrap.style.display = 'inline'
      const value = res.message
      document.querySelector('.requests-last-day').innerHTML = value
    })
    .catch(err => {
      console.error('Error fetching requestslastday', err)
    })
})
