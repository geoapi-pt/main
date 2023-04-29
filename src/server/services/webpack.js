const path = require('path')
const appRoot = require('app-root-path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')

const commonsDir = path.join(appRoot.path, 'routines', 'commons')
const { getFiles } = require(path.join(commonsDir, 'file.js'))

const srcDir = path.resolve(appRoot.path, 'src', 'public', 'src')

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
console.log('mode:', mode)

module.exports = async () => {
  const files = await getFiles(path.join(srcDir, 'js'))
  const jsFiles = files.filter(f => path.extname(f) === '.js')

  const JSentryPointsObj = {}
  jsFiles.forEach(file => {
    JSentryPointsObj[path.basename(file)] = file
  })

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
    mode: mode
  }, (err, stats) => {
    if (err || stats.hasErrors()) {
      if (err) {
        console.error(err)
        throw new Error(err)
      } else {
        console.log(
          stats.toString({
            chunks: false, // Makes the build much quieter
            colors: true // Shows colors in the console
          })
        )
        throw new Error()
      }
    }
  })
}
