const path = require('path')
// define directories
const servicesDir = path.join(__dirname, 'services')

// import server project modules
const webpack = require(path.join(servicesDir, 'webpack.js'))

webpack()
