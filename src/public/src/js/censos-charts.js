// import Chart from 'chart.js/auto' // if we want to import all modules
// see https://www.chartjs.org/docs/latest/getting-started/integration.html
import {
  Chart,
  BarController,
  BarElement,
  PieController,
  LineController,
  LineElement,
  PointElement,
  ArcElement,
  LinearScale,
  CategoryScale,
  Title,
  Legend,
  Tooltip,
  Colors
} from 'chart.js'
Chart.register(
  BarController,
  BarElement,
  PieController,
  LineController,
  LineElement,
  PointElement,
  ArcElement,
  LinearScale,
  CategoryScale,
  Title,
  Legend,
  Tooltip,
  Colors
)

export function loadCharts (administrationObject) {
  const censos2021 = administrationObject.censos2011
  const censosChartsMaping = administrationObject.censosChartsMaping
  console.log(censos2021)

  loadEdPorAnoConstr(censos2021, censosChartsMaping)
  loadEdClassPorDispUrb(censos2021, censosChartsMaping)
  loadEdClassPorNumAloj(censos2021, censosChartsMaping)
  loadEdPorTipoConstr(censos2021, censosChartsMaping)
}

function loadEdPorAnoConstr (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-edificios-data-constr')

  // Edifícios por ano de construção
  const obj = censosChartsMaping['Edifícios']['Por data de comstrução']
  const data = Object.values(obj).map(el => censos[el])
  const labels = Object.keys(obj)

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
function loadEdClassPorDispUrb (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-edificios-classicos-disp-urbana')

  // Edifícios por ano de construção
  const obj = censosChartsMaping['Edifícios']['Clássicos']['Por disposição urbana']
  const data = Object.values(obj).map(el => censos[el])
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
          text: 'Edifícios clássicos por disposição urbana'
        }
      }
    }
  })
}

// Edifícios clássicos por número de alojamentos
function loadEdClassPorNumAloj (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-edificios-classicos-num-aloj')

  // Edifícios por ano de construção
  const obj = censosChartsMaping['Edifícios']['Clássicos']['Por número de alojamentos']
  const data = Object.values(obj).map(el => {
    for (const el_ of el) {
      if (censos[el_]) return censos[el_]
    }
    return 0
  })
  const labels = Object.keys(obj)

  // eslint-disable-next-line no-new
  new Chart(chartCanvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        label: 'Edifícios clássicos por número de alojamentos',
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
          text: 'Edifícios clássicos por número de alojamentos'
        }
      }
    }
  })
}

// Edifícios por tipo de construção
function loadEdPorTipoConstr (censos, censosChartsMaping) {
  const chartCanvas = document.getElementById('censos-edificios-por-tipo-constr')

  // Edifícios por ano de construção
  const obj = censosChartsMaping['Edifícios']['Por tipo de construção']
  const data = Object.values(obj).map(el => censos[el])
  const labels = Object.keys(obj)

  // eslint-disable-next-line no-new
  new Chart(chartCanvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        label: 'Edifícios por tipo de construção',
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
          text: 'Edifícios por tipo de construção'
        }
      }
    }
  })
}
