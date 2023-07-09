const path = require('path')
const cssnano = require('cssnano')
const postcss = require('postcss')
const colors = require('colors/safe')
const appRoot = require('app-root-path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')

const commonsDir = path.join(appRoot.path, 'routines', 'commons')
const { getFiles } = require(path.join(commonsDir, 'file.js'))

const srcDir = path.resolve(appRoot.path, 'src', 'public', 'src').replace(/\\/g, '/')
const destDir = path.resolve(appRoot.path, 'src', 'public', 'dist')

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
console.log('mode:', mode)

module.exports = async () => {
  // assemble JS files as entry points
  const jsFiles = [path.join(srcDir, 'js', 'index.js')]
  const files = await getFiles(path.join(srcDir, 'js', 'routes'))
  jsFiles.push(...files.filter(f => path.extname(f) === '.js'))

  const JSentryPointsObj = {}
  jsFiles.forEach(file => {
    JSentryPointsObj[path.basename(file)] = file
  })

  webpack({
    entry: JSentryPointsObj,
    output: {
      filename: path.join('js', '[name]'),
      path: destDir,
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
            from: path.posix.join('*'),
            context: srcDir
          },
          {
            from: path.posix.join('img', '**/*'),
            context: srcDir
          },
          {
            from: path.posix.join('icons', '**/*'),
            context: srcDir
          },
          {
            from: path.posix.join('fonts', '**/*'),
            context: srcDir
          },
          {
            from: path.posix.join('css', '**/*'),
            context: srcDir,
            transform: minifyCss
          },
          {
            from: require.resolve('bootstrap/dist/css/bootstrap.css'),
            to: path.join('css', '[name].css'),
            context: srcDir,
            transform: minifyCss
          },
          {
            from: require.resolve('leaflet/dist/leaflet.css'),
            to: path.join('css', '[name].css'),
            context: srcDir,
            transform: minifyCss
          },
          {
            from: require.resolve('leaflet-contextmenu/dist/leaflet.contextmenu.css'),
            to: path.join('css', '[name].css'),
            context: srcDir,
            transform: minifyCss
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
        throw new Error(stats.toString())
      }
    } else {
      console.log(colors.green('Front-end assets built into ' + path.relative(appRoot.path, destDir)))
    }
  })
}

function minifyCss (content, path) {
  return postcss([cssnano])
    .process(content, {
      from: path
    })
    .then((result) => {
      return result.css
    })
}
