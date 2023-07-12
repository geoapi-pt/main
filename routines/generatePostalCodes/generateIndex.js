/* From the generated data (via generate.js script) which created json files in res/postal-codes/data,
   this script generates index files to be used for example by route /postal_codes */

const fs = require('fs')
const path = require('path')
const appRoot = require('app-root-path')

const commonsDir = path.join(appRoot.path, 'routines', 'commons')
const { getFiles } = require(path.join(commonsDir, 'file.js'))

const postalCodesResDir = path.join(appRoot.path, 'res', 'postal-codes')

const baseIndexFile = path.join(postalCodesResDir, 'baseIndex.json')
const indexFile = path.join(postalCodesResDir, 'index.json');

(async () => {
  const files = await getFiles(path.join(postalCodesResDir, 'data'))

  // build base Index: ["1000-000", ..., "9999-999"]
  let baseIndex = files
    .filter(f => path.extname(f) === '.json')
    .map(f =>
      path.relative(path.join(postalCodesResDir, 'data'), f)
        .split('.')[0]
        .replace('/', '-')
    )
    .filter(el => el.length === 8)
    .sort()

  // remove duplicates
  baseIndex = [...new Set(baseIndex)]

  fs.writeFileSync(baseIndexFile, JSON.stringify(baseIndex))

  /* build Index:
    {
      1000: { 000: {}, ..., 999: {} }
      ...,
      9999: { 000: {}, ..., 999: {} }
    }
  */
  const indexObj = {}
  baseIndex.forEach(el => {
    const cp4 = el.split('-')[0]
    const cp3 = el.split('-')[1]
    if (!indexObj.hasOwnProperty(cp4)) { // eslint-disable-line
      indexObj[cp4] = {}
    }
    indexObj[cp4][cp3] = {}
  })

  fs.writeFileSync(indexFile, JSON.stringify(indexObj))

  console.log('Index files generated OK')
  console.log(path.relative(appRoot.path, baseIndexFile))
  console.log(path.relative(appRoot.path, indexFile))
})()
