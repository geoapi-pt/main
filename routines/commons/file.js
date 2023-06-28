const fs = require('fs')
const path = require('path')
const async = require('async')
const ProgressBar = require('progress')
const appRoot = require('app-root-path')
const gjv = require('geojson-validation')
const debug = require('debug')('geoapipt:file')

module.exports = { getFiles, deleteAllFilesBasedOnExt, validateAllJsonFilesAsGeojson, createDirIfNotExist }

// read files recursively from directory
async function getFiles (dir) {
  if (Array.isArray(dir)) {
    const files = await Promise.all(dir.map(d => getFiles(d)))
    return files.flat()
  } else {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
    const files = await Promise.all(dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name)
      return dirent.isDirectory() ? getFiles(res) : res
    }))
    return files.flat()
  }
}

function deleteAllFilesBasedOnExt (dir, extension, mainCallback) {
  console.log(`Deleting all ${extension} files in ${
    !Array.isArray(dir) ? path.relative(appRoot.path, dir) : dir.map(e => path.relative(appRoot.path, e)).join(', ')
  }`)

  // read files recursively from directory
  getFiles(dir).then(files => {
    const filesToDelete = files.filter(f => path.extname(f) === extension) // ex: extension === '.json'

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

function validateAllJsonFilesAsGeojson (dir, mainCallback) {
  console.log(`Validating all files (.geojson and .json) as GeoJson in ${
    !Array.isArray(dir) ? path.relative(appRoot.path, dir) : dir.map(e => path.relative(appRoot.path, e)).join(', ')
  }`)

  // read files recursively from directory
  getFiles(dir).then(files => {
    const filesToValidate = files.filter(f => path.extname(f) === '.json' || path.extname(f) === '.geojson')

    let bar
    if (!debug.enabled) {
      bar = new ProgressBar('[:bar] :percent :info', { total: filesToValidate.length + 2, width: 80 })
    } else {
      bar = { tick: () => {}, terminate: () => {} }
    }

    bar.tick({ info: 'Validating' })

    async.eachOf(filesToValidate, function (file, key, callback) {
      try {
        if (fs.existsSync(file)) {
          const data = JSON.parse(fs.readFileSync(file))
          if (!gjv.valid(data)) {
            console.error(`\n${file} is invalid GeoJSON\n`)
            throw Error(`${file} is invalid GeoJSON`)
          } else {
            debug(`${path.relative(appRoot.path, file)} validated`)
            bar.tick({ info: path.relative(appRoot.path, file) })
          }
        } else {
          bar.tick()
        }
        callback()
      } catch (err) {
        console.error(`\n${file} is invalid GeoJSON\n`)
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

function createDirIfNotExist (dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}
