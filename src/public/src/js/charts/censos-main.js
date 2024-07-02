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

import * as edificios from './censos-edificios.js'
import * as individuos from './censos-individuos.js'

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
  const censos = {
    2011: administrationObject.censos2011,
    2021: administrationObject.censos2021
  }

  const censosChartsMaping = administrationObject.censosChartsMaping

  console.log(censos)

  document.addEventListener('DOMContentLoaded', function () {
    // Edifícios
    // Definição de Edifício Clássico
    const edifDescr = document.getElementById('censos-edificio-description')
    edifDescr.textContent = censosChartsMaping['Edifícios'].__conceito['definição']
    // Definição de Edifício Clássico
    const edifClassicoDescr = document.getElementById('censos-edificio-classico-description')
    edifClassicoDescr.textContent = censosChartsMaping['Edifícios']['Clássicos'].__conceito['definição']

    edificios.loadEdPorAnoConstr(censos, censosChartsMaping)
    edificios.loadEdClassPorDispUrb(censos, censosChartsMaping)
    edificios.loadEdClassPorNumAloj(censos, censosChartsMaping)
    edificios.loadEdPorTipoConstr(censos, censosChartsMaping)
    edificios.loadEdPorUtiliz(censos, censosChartsMaping)
    edificios.loadEdPorNumPisos(censos, censosChartsMaping)

    // Indivíduos
    individuos.loadIndivPorIdade(censos, censosChartsMaping)
    individuos.loadIndivPorSexo(censos, censosChartsMaping)
  })
}
