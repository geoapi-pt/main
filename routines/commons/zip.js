const fs = require('fs')
const path = require('path')
const async = require('async')
const JSZip = require('jszip')
const appRoot = require('app-root-path')
const ProgressBar = require('progress')
const debug = require('debug')('geoapipt:zip')

module.exports = { extractZip, deleteNonZipFiles }

function extractZip (dir, mainCallback) {
  console.log('Unzipping files in ' + path.relative(appRoot.path, dir))

  // read files recursively from directory
  getFiles(dir).then(files => {
    const filesToExtract = files.filter(f => path.extname(f) === '.zip')

    let bar
    if (!debug.enabled) {
      bar = new ProgressBar('[:bar] :percent :info', { total: filesToExtract.length + 2, width: 80 })
    } else {
      bar = { tick: () => {}, terminate: () => {} }
    }

    bar.tick({ info: 'Extracting' })

    async.eachOf(filesToExtract, function (file, key, callback) {
      fs.readFile(file, function (errOnUnzip, data) {
        if (errOnUnzip) {
          callback(Error('Error reading file ' + file + '. ' + errOnUnzip.message))
        } else {
          JSZip.loadAsync(data).then(function (zip) {
            const promArr = []
            Object.keys(zip.files).forEach(function (filename) {
              const prom = zip.files[filename].async('nodebuffer')
              promArr.push(prom)
              prom.then(function (fileData) {
                const destFilepath = path.join(path.dirname(file), filename)
                fs.writeFileSync(destFilepath, fileData)
              })
            })
            Promise.all(promArr).then((values) => {
              bar.tick({ info: path.relative(appRoot.path, file) })
              debug(path.relative(appRoot.path, file) + ' extracted')
              callback()
            })
          })
        }
      })
    }, function (err) {
      bar.tick({ info: '' })
      bar.terminate()
      if (err) {
        mainCallback(Error(err))
      } else {
        mainCallback()
      }
    })
  })
}

function deleteNonZipFiles (dir, mainCallback) {
  console.log('Deleting all non-zip files in ' + path.relative(appRoot.path, dir))
  // read files recursively from directory
  getFiles(dir).then(files => {
    const filesToDelete = files.filter(f => path.extname(f) !== '.zip')

    let bar
    if (!debug.enabled) {
      bar = new ProgressBar('[:bar] :percent :info', { total: filesToDelete.length + 2, width: 80 })
    } else {
      bar = { tick: () => {}, terminate: () => {} }
    }

    bar.tick({ info: 'Deleting' })

    async.eachOf(filesToDelete, function (file, key, callback) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file)
          debug(`${path.relative(appRoot.path, file)} deleted`)
          bar.tick({ info: path.relative(appRoot.path, file) })
        } else {
          bar.tick()
        }
        callback()
      } catch (err) {
        callback(Error(err))
      }
    }, function (err) {
      bar.tick({ info: '' })
      bar.terminate()
      if (err) {
        mainCallback(Error(err))
      } else {
        mainCallback()
      }
    })
  })
}

// read files recursively from directory
async function getFiles (dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name)
    return dirent.isDirectory() ? getFiles(res) : res
  }))
  return files.flat()
}
