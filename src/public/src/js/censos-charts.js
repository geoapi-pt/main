// import Chart from 'chart.js/auto' // if we want to import all modules
// see https://www.chartjs.org/docs/latest/getting-started/integration.html
import {
  Chart,
  BarController,
  BarElement,
  PieController,
  ArcElement,
  LinearScale,
  CategoryScale,
  Legend,
  Colors
} from 'chart.js'
Chart.register(
  BarController,
  BarElement,
  PieController,
  ArcElement,
  LinearScale,
  CategoryScale,
  Legend,
  Colors
)

const ctx = document.getElementById('censosChart')

// eslint-disable-next-line no-new
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
    datasets: [{
      label: '# of Votes',
      data: [12, 19, 3, 5, 2, 3],
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
    }
  }
})
