/* validate emails from the geoptapi, using zerobounce.net */

const fs = require('fs')
const path = require('path')
const https = require('https')
const async = require('async')
const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')

const jsonResFiles = {
  municipalities2021: 'detalhesMunicipios2021.json'
}

const apiKey = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8')).zerobounce.apiKey

const optionDefinitions = [
  { name: 'credits', alias: 'c', type: Boolean, description: 'Fecthes the remaining amount of credits for the API' },
  { name: 'municipalities', alias: 'm', type: Boolean, description: 'Validates emails of municipalities' },
  { name: 'parishes', alias: 'p', type: Boolean, description: 'Validates emails of parishes' },
  { name: 'help', alias: 'h', type: Boolean }
]
const claOptions = commandLineArgs(optionDefinitions)

const sections = [
  {
    header: 'Validatdes emails',
    content: 'Validate the municipalities and parishes emails of the geoptapi, using zerobounce.net API'
  },
  {
    header: 'Options',
    optionList: optionDefinitions
  }
]

if (claOptions.help || Object.keys(claOptions).length === 0) {
  const usage = commandLineUsage(sections)
  console.log(usage)
}

/* ===================================================================================== */
// Fecthes the remaining amount of credits for the API

if (claOptions.credits) {
  const options = {
    hostname: 'api.zerobounce.net',
    port: 443,
    path: 'https://api.zerobounce.net/v2/getcredits?api_key=' + apiKey,
    method: 'GET',
    secureProtocol: 'TLSv1_2_method'
  }

  https.request(options, res => {
    let body = ''
    res.on('data', (d) => { body += d })
    res.on('end', () => {
      const result = JSON.parse(body)
      console.log(result)
    })
  }).on('error', (err) => {
    console.error(err)
  }).end()
}

/* ===================================================================================== */
/* ===================================================================================== */

if (claOptions.municipalities) {
  const muncicipalitiesDetails = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'res', jsonResFiles.municipalities2021), 'utf8')
  ).municipios

  // when a municipality has multiple emails, create other records
  const municipalities = []
  for (const municipality of muncicipalitiesDetails) {
    const emails = municipality['E-mail'].trim().split(';')
    for (const email of emails) {
      const municipalityCopy = Object.assign({}, municipality) // clone object
      municipalityCopy['E-mail'] = email.trim()
      municipalities.push(municipalityCopy)
    }
  }

  async.eachLimit(municipalities, 40, function (municipality, callback) {
    const email = municipality['E-mail'].trim()
    const options = {
      hostname: 'api.zerobounce.net',
      port: 443,
      path: '/v2/validate?api_key=' + apiKey + '&email=' + encodeURI(email),
      method: 'GET',
      secureProtocol: 'TLSv1_2_method'
    }

    https.request(options, (res) => {
      let body = ''
      res.on('data', (d) => { body += d })
      res.on('end', () => {
        const result = JSON.parse(body)
        if (result.status !== 'valid' && result.status !== 'catch-all' && result.status !== 'unknown') {
          console.log(municipality['MUNICÍPIO'])
          console.log(result)
        }
        callback()
      })
    }).on('error', (err) => {
      callback(Error(`Error with ${email}: ${err}`))
    }).end()
  }, function (err) {
    if (err) {
      console.error(Error(err))
      process.exitCode = 1
    }
  })
}
