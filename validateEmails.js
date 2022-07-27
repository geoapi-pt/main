/* validate emails from the geoapi.pt, using zerobounce.net */

const fs = require('fs')
const path = require('path')
const https = require('https')
const async = require('async')
const verifier = require('email-verify')
const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')

const jsonResFiles = {
  parishes2021: 'detalhesFreguesias2021.json',
  municipalities2021: 'detalhesMunicipios2021.json'
}

let municipalities
let parishes

const apiKey = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8')).zerobounce.apiKey

const optionDefinitions = [
  { name: 'credits', alias: 'c', type: Boolean, description: 'Fecthes the remaining amount of credits for the zerobounce API' },
  { name: 'municipalities', alias: 'm', type: Boolean, description: 'Validates emails of municipalities' },
  { name: 'parishes', alias: 'p', type: Boolean, description: 'Validates emails of parishes' },
  { name: 'zerobounce', alias: 'z', type: Boolean, description: 'Uses zerobounce API (PAID)' },
  { name: 'email-verify', alias: 'e', type: Boolean, description: 'Uses NPM module email-verify' },
  { name: 'help', alias: 'h', type: Boolean }
]
const claOptions = commandLineArgs(optionDefinitions)

const sections = [
  {
    header: 'Validatdes emails',
    content: 'Validate the municipalities and parishes emails of the geoapi.pt, using zerobounce.net API or email-verify NPM module'
  },
  {
    header: 'Options',
    optionList: optionDefinitions
  }
]

const usage = commandLineUsage(sections)

if (claOptions.help || Object.keys(claOptions).length === 0) {
  console.log(usage)
} else if (!claOptions.zerobounce && !claOptions['email-verify']) {
  console.log('You should select one of the modes, either with zerobounce API or NPM module email-verify')
  console.log(usage)
}

if (claOptions.zerobounce || claOptions['email-verify']) {
  if (claOptions.municipalities) {
    const municipalitiesDetails = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', jsonResFiles.municipalities2021), 'utf8')
    ).municipios

    // when a municipality has multiple emails, create other records to verify all the emails
    municipalities = []
    for (const municipality of municipalitiesDetails) {
      const emails = municipality['E-mail'].trim().split(';')
      for (const email of emails) {
        const municipalityCopy = Object.assign({}, municipality) // clone object
        municipalityCopy['E-mail'] = email.trim()
        municipalities.push(municipalityCopy)
      }
    }
  }

  if (claOptions.parishes) {
    const parishesDetails = JSON.parse(fs.readFileSync(
      path.join(__dirname, 'res', jsonResFiles.parishes2021), 'utf8')
    ).Contatos_freguesias

    // when a municipality has multiple emails, create other records
    parishes = []
    for (const parish of parishesDetails) {
      if (parish.EMAIL) {
        const emails = parish.EMAIL.trim().split(';')
        for (const email of emails) {
          const parishCopy = Object.assign({}, parish) // clone object
          parishCopy.EMAIL = email.trim()
          parishes.push(parishCopy)
        }
      }
    }
  }
}

/* ===================================================================================== */
/*                        ZEROBOUNCE API                                                 */
/* ===================================================================================== */

if (claOptions.zerobounce) {
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

  if (claOptions.municipalities) {
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

  /* ===================================================================================== */

  if (claOptions.parishes) {
    async.eachLimit(parishes, 40, function (parish, callback) {
      const email = parish.EMAIL.trim()
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
            console.log(parish.NOME)
            console.log(result.address)
            console.log(result.status)
            console.log(result.sub_status, '\n\n')
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
}

/* ===================================================================================== */
/*                        NPM MODULE email-verify                                        */
/* ===================================================================================== */

if (claOptions['email-verify']) {
  if (claOptions.municipalities) {
    let numberOfFailed = 0
    async.each(municipalities, function (municipality, callback) {
      const email = municipality['E-mail'].trim()
      verifier.verify(email, {
        timeout: 30 * 60 * 1000,
        sender: 'joao.pimentel.ferreira@gmail.com',
        fqdn: 'gmail.com'
      }, function (err, info) {
        if (err) {
          numberOfFailed++
          callback(Error(err))
        } else if (info.success) {
          callback()
        } else {
          numberOfFailed++
          console.log(info)
          callback()
        }
      })
    }, function (err) {
      if (err) {
        console.error(Error(err))
        process.exitCode = 1
      }
      console.log(`Failed ${numberOfFailed / municipalities.length * 100}%`)
    })
  }

  /* ===================================================================================== */

  if (claOptions.parishes) {
    async.eachLimit(parishes, 40, function (parish, callback) {
      const email = parish.EMAIL.trim()
      verifier.verify(email, {
        timeout: 30 * 60 * 1000,
        sender: 'joao.pimentel.ferreira@gmail.com',
        fqdn: 'gmail.com'
      }, function (err, info) {
        if (err) {
          callback(Error(err))
        } else if (info.success) {
          callback()
        } else {
          console.log(info)
          callback()
        }
      })
    }, function (err) {
      if (err) {
        console.error(Error(err))
        process.exitCode = 1
      }
    })
  }
}
