const fs = require('fs')
const path = require('path')
const JSZip = require('jszip')

module.exports = async ({ file }) => {
  await extractZip(file)
}

function extractZip (file) {
  return new Promise(resolve => {
    const zip = new JSZip()
    const geojsonData = fs.readFileSync(file)
    zip.file(path.basename(file), geojsonData)

    zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(fs.createWriteStream(file + '.zip'))
      .on('finish', function () {
        resolve()
      })
  })
}
