const path = require('path')
const express = require('express')
const appRoot = require('app-root-path')

const srcDir = path.join(appRoot.path, 'src')
const utilsDir = path.join(srcDir, 'server', 'utils')
const geotiffsDir = path.join(appRoot.path, '..', 'resources', 'res', 'altimetria', 'tif', 'regions')

const isResponseJson = require(path.join(utilsDir, 'isResponseJson.js'))

module.exports = (app) => {
  app.use('/', (req, res, next) => {
    if (isResponseJson(req)) {
      next()
    } else {
      // only serve static files for the HTML request
      express.static(path.join(srcDir, 'public', 'dist'), { etag: false })(req, res, next)
    }
  })

  app.use('/geotiff', (req, res, next) => {
    if (isResponseJson(req)) {
      next()
    } else {
      // only serve static files for the HTML request
      express.static(geotiffsDir, { etag: false })(req, res, next)
    }
  })
}
