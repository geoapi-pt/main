const path = require('path')
const express = require('express')
const appRoot = require('app-root-path')

const srcDir = path.join(appRoot.path, 'src')
const utilsDir = path.join(srcDir, 'server', 'utils')

const isResponseJson = require(path.join(utilsDir, 'isResponseJson.js'))

module.exports = (req, res, next) => {
  if (isResponseJson(req)) {
    next()
  } else {
    // only serve static files for the HTML request
    express.static(path.join(srcDir, 'public', 'dist'), { etag: false })(req, res, next)
  }
}
