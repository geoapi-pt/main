const fs = require('fs')
const path = require('path')
const async = require('async')
const appRoot = require('app-root-path')
const { simpleSitemapAndIndex } = require('sitemap')
const colors = require('colors/safe')

// origin=scheme+host+port, ex: http://example.com:8080
const defaultOrigin = JSON.parse(fs.readFileSync(path.join(appRoot.path, 'configs.json'))).defaultOrigin

const sitemapsDir = path.join(appRoot.path, 'src', 'public', 'src')

const getRegionsAndAdmins = require(path.join(appRoot.path, 'src', 'server', 'services', 'getRegionsAndAdmins.js'))
const preparePostalCodesCTTMod = require(path.join(__dirname, 'generatePostalCodes', 'prepareCTTfile.js'))

let administrations, postalCodes, CP4postalCodes

console.log('Starting. Please wait...')
async.series([prepareRegions, preparePostalCodesCTT, createSitemap],
  function (err) {
    if (err) {
      console.error(err)
      process.exit(1)
    } else {
      console.log('Everything done with ' + colors.green.bold('success'))
      console.log(`Sitemaps created at ${path.relative(appRoot.path, sitemapsDir)}/`)
    }
  })

function prepareRegions (cb) {
  getRegionsAndAdmins((err, data) => {
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
  console.log('Creating sitemaps, please wait...')

  const links = []
  for (const CP of postalCodes) {
    links.push({ url: `/cp/${CP}`, changefreq: 'monthly', priority: 0.5 })
  }
  for (const CP4 of CP4postalCodes) {
    links.push({ url: `/cp/${CP4}`, changefreq: 'monthly', priority: 0.5 })
  }

  links.push({ url: '/municipios', changefreq: 'monthly', priority: 0.5 })
  links.push({ url: '/municipios/freguesias', changefreq: 'monthly', priority: 0.5 })

  // /municipio/{município} and /municipio/{município}/freguesias
  for (const municipality of administrations.listOfMunicipalitiesNames) {
    links.push({ url: `/municipio/${encodeStr(municipality)}`, changefreq: 'monthly', priority: 0.5 })
    links.push({ url: `/municipio/${encodeStr(municipality)}/freguesias`, changefreq: 'monthly', priority: 0.5 })
  }

  for (const municipality of administrations.listOfMunicipalitiesWithParishes) {
    for (const parish of municipality.freguesias) {
      links.push({
        url: `/municipio/${encodeStr(municipality.nome)}/freguesia/${encodeStr(parish)}`,
        changefreq: 'monthly',
        priority: 0.5
      })
    }
  }

  links.push({ url: '/distritos', changefreq: 'monthly', priority: 0.5 })
  links.push({ url: '/distritos/municipios', changefreq: 'monthly', priority: 0.5 })

  for (const district of administrations.listOfDistricts) {
    links.push({
      url: `/distrito/${encodeStr(district)}`,
      changefreq: 'monthly',
      priority: 0.5
    })
    links.push({
      url: `/distrito/${encodeStr(district)}/municipios`,
      changefreq: 'monthly',
      priority: 0.5
    })
    links.push({
      url: `/distrito/${encodeStr(district)}/freguesias`,
      changefreq: 'monthly',
      priority: 0.5
    })
  }

  // writes sitemaps and index out to the destination you provide.
  simpleSitemapAndIndex({
    hostname: defaultOrigin,
    destinationDir: sitemapsDir,
    sourceData: links
  }).then(() => {
    cb()
  })
}

function removeDuplicatesFromArray (array) {
  return [...new Set(array)]
}

function encodeStr (str) {
  return encodeURIComponent(str.toLowerCase())
}
