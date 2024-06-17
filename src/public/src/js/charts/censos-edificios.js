import { Chart } from 'chart.js'

// Edifícios por ano de construção
export function loadEdPorAnoConstr (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-edificios-data-constr')

  const obj = censosChartsMaping['Edifícios']['Por data de comstrução']
  // censos 2011 have more refined info about date of constructions of buildings till 2011
  const data = getData(obj, censos[2011])
  const labels = Object.keys(obj)
  // from 2011 to 2021 use info from censos 2021
  data.push(censos[2021].N_EDIFICIOS_CONSTR_2011_2021)
  labels.push('2011 a 2021')

  // eslint-disable-next-line no-new
  new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      },
      tooltips: {
        mode: 'index'
      },
      plugins: {
        title: {
          display: true,
          text: 'Edifícios por ano de construção'
        },
        legend: {
          display: false
        }
      }
    }
  })
}

// Edifícios clássicos por disposição urbana
export function loadEdClassPorDispUrb (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-edificios-classicos-disp-urbana')

  const obj = censosChartsMaping['Edifícios']['Clássicos']['Por disposição urbana']
  const data = getData(obj, censos[2011])
  const labels = Object.keys(obj)

  // eslint-disable-next-line no-new
  new Chart(chartCanvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        label: 'Edifícios clássicos por disposição urbana',
        data,
        borderWidth: 1
      }]
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
          text: 'Edifícios clássicos por disposição urbana (2011)'
        }
      }
    }
  })
}

// Edifícios clássicos por número de alojamentos
export function loadEdClassPorNumAloj (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-edificios-classicos-num-aloj')

  const obj = censosChartsMaping['Edifícios']['Clássicos']['Por número de alojamentos']
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
          text: 'Edifícios clássicos por número de alojamentos'
        }
      }
    }
  })
}

// Edifícios por tipo de construção
export function loadEdPorTipoConstr (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-edificios-por-tipo-constr')

  const obj = censosChartsMaping['Edifícios']['Por tipo de construção']
  const data = getData(obj, censos[2011])
  const labels = Object.keys(obj)

  // eslint-disable-next-line no-new
  new Chart(chartCanvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Edifícios por tipo de construção',
        data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(255, 159, 64, 0.5)',
          'rgba(255, 205, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(54, 162, 235, 0.5)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(255, 159, 64)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)',
          'rgb(54, 162, 235)'
        ],
        borderWidth: 1
      }]
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
          text: 'Edifícios por tipo de construção (2011)'
        },
        legend: {
          display: false
        }
      }
    }
  })
}

// Edifícios por utilização
export function loadEdPorUtiliz (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-edificios-por-utiliz')

  const obj = censosChartsMaping['Edifícios']['Por utilização']
  const data = getData(obj, censos[2011])
  const labels = Object.keys(obj)

  // eslint-disable-next-line no-new
  new Chart(chartCanvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        label: 'Edifícios por utilização',
        data,
        borderWidth: 1
      }]
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
          text: 'Edifícios por utilização (2011)'
        }
      }
    }
  })
}

// Edifícios por número de pisos
export function loadEdPorNumPisos (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-edificios-por-num-pisos')

  const obj = censosChartsMaping['Edifícios']['Por número de pisos']
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
          text: 'Edifícios por número de pisos (2011)'
        }
      }
    }
  })
}

// see file censosChartsMaping.json
export function getData (obj, censos) {
  const data = Object.values(obj).map(el => {
    if (Array.isArray(el)) {
      for (const el_ of el) {
        if (!el_.includes('+')) {
          if (censos[el_]) return censos[el_]
        } else {
          return el_.split('+').reduce((accumulator, a) => accumulator + (censos[a] || 0), 0)
        }
      }
      return 0
    } else {
      return censos[el]
    }
  })
  return data
}
