const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')

const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')

const srcDir = path.resolve(appRoot.path, 'src', 'public', 'src')

const JSentryPointsObj = {}
fs.readdirSync(path.join(srcDir, 'js', 'routes')).forEach(filename => {
  JSentryPointsObj[filename] = path.join(srcDir, 'js', 'routes', filename)
})

module.exports = (callback) => {
  webpack({
    entry: JSentryPointsObj,
    output: {
      filename: path.join('js', '[name]'),
      path: path.resolve(appRoot.path, 'src', 'public', 'dist'),
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.png/,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: path.join('*'),
            context: srcDir
          },
          {
            from: path.join('img', '**/*'),
            context: srcDir
          },
          {
            from: path.join('fonts', '**/*'),
            context: srcDir
          },
          {
            from: path.join('css', '**/*'),
            context: srcDir
          },
          {
            from: require.resolve('leaflet/dist/leaflet.css'),
            to: path.join('css', '[name].css'),
            context: srcDir
          },
          {
            from: require.resolve('leaflet-contextmenu/dist/leaflet.contextmenu.min.css'),
            to: path.join('css', '[name].css'),
            context: srcDir
          }
        ]
      })
    ],
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development'
  }, (err, stats) => {
    if (err || stats.hasErrors()) {
      if (err) {
        console.error(err)
        callback(Error(err))
      } else {
        console.log(
          stats.toString({
            chunks: false, // Makes the build much quieter
            colors: true // Shows colors in the console
          })
        )
        callback(Error())
      }
    }
    callback()
  })
}
