const fs = require('fs')
const path = require('path')
const colors = require('colors')
const ProgressBar = require('progress')
const appRoot = require('app-root-path')
const geojsonhint = require('@mapbox/geojsonhint')

const commonsDir = path.join(appRoot.path, 'routines', 'commons')
const { getFiles } = require(path.join(commonsDir, 'file.js'))

const geojsonDir = path.join(appRoot.path, 'res', 'geojson')

module.exports = () => {
  return new Promise((resolve, reject) => {
    console.log('Validating Geojson files in ' + path.relative(appRoot.path, geojsonDir))

    let files;
    (async () => {
      files = await getFiles(geojsonDir)
      files = files.filter(f => path.extname(f) === '.geojson')

      const bar = new ProgressBar(
        '[:bar] :percent :info', { total: 2 * files.length + 1, width: 80 }
      )

      const filesPromises = files.map(file => {
        const fileRelativePath = path.relative(appRoot.path, file)
        bar.tick({ info: fileRelativePath })

        return new Promise((resolve, reject) => {
          fs.readFile(file, 'utf-8', (err, data) => {
            if (data && !err) {
              const lintErrors = geojsonhint.hint(data)
              if (Array.isArray(lintErrors)) {
                if (!lintErrors.length) {
                  bar.tick({ info: fileRelativePath })
                  resolve()
                } else {
                  console.error(lintErrors)
                  reject(Error('geojson hint error on ' + fileRelativePath))
                }
              } else {
                reject(Error('Geojson lintErrors is not an Array, on ' + fileRelativePath))
              }
            } else if (!err) {
              reject(Error(fileRelativePath + ' : ' + err.message))
            } else {
              reject(Error(fileRelativePath + ' : empry data'))
            }
          })
        })
      })

      Promise.all(filesPromises)
        .then(() => {
          bar.tick({ info: '' })
          console.log(colors.green('Geojson files validated successfully'))
          resolve()
        }).catch(err => {
          console.error(err)
          reject(Error(err.message))
        })
    })()
  })
}

(async () => {
  await module.exports()
})()
