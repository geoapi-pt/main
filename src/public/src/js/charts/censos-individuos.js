import { Chart } from 'chart.js'
import { getData } from './common.js'

// Indivíduos residentes por idade
export function loadIndivPorIdade (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-individuos-por-idade')

  const obj = censosChartsMaping['Indivíduos']['Por idade']
  console.log(obj)
  const labels = Object.keys(obj)
  const data2011 = getData(obj, censos[2011])
  const data2021 = getData(obj, censos[2021])

  // eslint-disable-next-line no-new
  new Chart(chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '2011',
          data: data2011,
          borderWidth: 1
        },
        {
          label: '2021',
          data: data2021,
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      tooltips: {
        mode: 'index'
      },
      plugins: {
        title: {
          display: true,
          text: 'Indivíduos por idade'
        }
      }
    }
  })
}
