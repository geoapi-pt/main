import { Chart } from 'chart.js'
import { getData } from './common.js'

// Indivíduos residentes por idade
export function loadIndivPorIdade (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-individuos-por-idade')

  const obj = censosChartsMaping['Indivíduos']['Por idade']

  const labels = Object.keys(obj)

  const datasets = []
  if (censos[2011]) {
    datasets.push({
      label: '2011',
      data: getData(obj, censos[2011]),
      borderWidth: 1
    })
  }
  if (censos[2021]) {
    datasets.push({
      label: '2021',
      data: getData(obj, censos[2021]),
      borderWidth: 1
    })
  }

  // eslint-disable-next-line no-new
  new Chart(chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets
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

// Indivíduos residentes por sexo
export function loadIndivPorSexo (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-individuos-por-sexo')

  const obj = censosChartsMaping['Indivíduos']['Por sexo']

  const labels = Object.keys(obj)

  const datasets = []
  if (censos[2011]) {
    datasets.push({
      label: '2011',
      data: getData(obj, censos[2011]),
      borderWidth: 1
    })
  }
  if (censos[2021]) {
    datasets.push({
      label: '2021',
      data: getData(obj, censos[2021]),
      borderWidth: 1
    })
  }

  // eslint-disable-next-line no-new
  new Chart(chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets
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
          text: 'Indivíduos por sexo'
        }
      }
    }
  })
}
