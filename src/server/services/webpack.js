const path = require('path')
const colors = require('colors/safe')
const appRoot = require('app-root-path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

const commonsDir = path.join(appRoot.path, '..', 'resources', 'routines', 'commons')
const { getFiles } = require(path.join(commonsDir, 'file.js'))

const srcDir = path.resolve(appRoot.path, 'src', 'public', 'src').replace(/\\/g, '/')
const docsDir = path.resolve(appRoot.path, 'docs', 'dist').replace(/\\/g, '/')
const destDir = path.resolve(appRoot.path, 'src', 'public', 'dist')

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
console.log('mode:', mode)

module.exports = async () => {
  // assemble JS files as entry points
  const jsFiles = [
    path.join(srcDir, 'js', 'index.js'),
    path.join(srcDir, 'js', 'components-basic.js')
  ]
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
        },
        {
          test: /\.css$/i,
          use: [MiniCssExtractPlugin.loader, 'css-loader']
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource'
        }
      ]
    },
    optimization: {
      minimizer: [
        '...', // For webpack@5 you can use the `...` syntax to extend existing minimizers (i.e. `terser-webpack-plugin` for JS minification)
        new CssMinimizerPlugin()
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'css/[name].css'
      }),
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
            from: path.posix.join('*'),
            to: 'docs',
            context: docsDir
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
      console.log(colors.green('\nFront-end assets built into ' + path.relative(appRoot.path, destDir)))
    }
  })
}
