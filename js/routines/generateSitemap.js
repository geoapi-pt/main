const fs = require('fs')
const path = require('path')
const async = require('async')
const appRoot = require('app-root-path')
const { SitemapStream, streamToPromise } = require('sitemap')
const { Readable } = require('stream')
const colors = require('colors/safe')

const mainPageUrl = 'https://geoapi.pt'

const prepareServer = require(path.join(appRoot.path, 'js', 'server-modules', 'prepareServer.js'))
const preparePostalCodesCTTMod = require(path.join(__dirname, 'generatePostalCodes', 'prepareCTTfile.js'))

const xmlFilePath = path.join(appRoot.path, 'views', 'sitemap.xml')

let administrations, postalCodes, CP4postalCodes

console.log('Starting. Please wait...')
async.series([prepareRegions, preparePostalCodesCTT, createSitemap],
  function (err) {
    if (err) {
      console.error(err)
      process.exit(1)
    } else {
      console.log('Everything done with ' + colors.green.bold('success'))
    }
  })

function prepareRegions (cb) {
  prepareServer((err, data) => {
    if (err) {
      cb(Error(err))
    } else {
      administrations = data.administrations
      cb()
    }
  })
}

function preparePostalCodesCTT (cb) {
  preparePostalCodesCTTMod.prepare((err, cttData) => {
    if (err) {
      cb(Error(err))
    } else {
      postalCodes = removeDuplicatesFromArray(cttData.map(el => el.CP))
      console.log(`Found ${postalCodes.length} different CP4-CP3 postal codes in CTT file`)
      CP4postalCodes = removeDuplicatesFromArray(cttData.map(el => el.CP4))
      console.log(`Found ${CP4postalCodes.length} different CP4 postal codes in CTT file`)
      cb()
    }
  })
}

function createSitemap (cb) {
  const links = []
  for (const CP of postalCodes) {
    links.push({ url: `/cp/${CP}`, changefreq: 'daily', priority: 0.5 })
  }
  for (const CP4 of CP4postalCodes) {
    links.push({ url: `/cp/${CP4}`, changefreq: 'daily', priority: 0.5 })
  }

  // /municipio/{município} and /municipios/{município}/freguesias
  for (const municipality of administrations.listOfMunicipalitiesNames) {
    links.push({ url: `/municipio/${encodeURIComponent(municipality)}`, changefreq: 'daily', priority: 0.5 })
    links.push({ url: `/municipio/${encodeURIComponent(municipality)}/freguesias`, changefreq: 'daily', priority: 0.5 })
  }

  // /freguesia/{freguesia}, replace(/ *\([^)]*\) */g, "") removes text between parentheses
  for (const parish of administrations.listOfParishesNames) {
    links.push({
      url: `/freguesia/${encodeURIComponent(parish.replace(/ *\([^)]*\) */g, ''))}`,
      changefreq: 'daily',
      priority: 0.5
    })
  }

  links.push({ url: '/distritos/municipios', changefreq: 'daily', priority: 0.5 })

  // Create a stream to write to
  const stream = new SitemapStream({ hostname: mainPageUrl })

  // Return a promise that resolves with your XML string
  streamToPromise(Readable.from(links).pipe(stream)).then((data) =>
    data.toString()
  ).then(xml => {
    try {
      fs.writeFileSync(xmlFilePath, xml)
      console.log('XML file created OK on ' + xmlFilePath)
      cb()
    } catch (err) {
      cb(Error(err))
    }
  }).catch(err => {
    cb(Error(err))
  })
}

function removeDuplicatesFromArray (array) {
  return [...new Set(array)]
}
