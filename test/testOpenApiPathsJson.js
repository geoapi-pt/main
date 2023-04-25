const got = require('got')
const path = require('path')
const async = require('async')

module.exports = TEST_PORT => mainCallback => {
  console.log('Test OpenAPI routes with JSON request')
  async.each(
    require(path.join(__dirname, 'openApiPaths'))(),
    function (urlAbsolutePath, eachCallback) {
      const url = encodeURI(`http://localhost:${TEST_PORT}${urlAbsolutePath}`)
      got(url).json()
        .then(body => {
          console.log(`Testing: ${urlAbsolutePath}`)
          if (body.error || body.erro) {
            console.error(body.error || body.erro)
            eachCallback(Error(`\nError on ${url}`))
          } else {
            const gpsRegex = /^\/gps\/.+/
            const regexMunicipios = /^\/municipios?\/[^/]+$/
            const regexFreguesias = /^\/municipios?\/[^/]+\/freguesias?(\/[^/]+)?$/
            const regexSections = /^\/municipios?\/.+\/sec\/.\d+$/
            const regexSubsections = /^\/municipios?\/.+\/sec\/\d+\/ss\/\d+$/
            const regexDistritos = /^\/distritos?\/.+/
            const postalCodeCP4 = /^\/cp\/\d{4}$/
            const postalCodeCP7 = /^\/cp\/\d{4}\p{Dash}?\d{3}$/u

            if (gpsRegex.test(urlAbsolutePath)) {
              if (
                body.distrito &&
                body.concelho &&
                body.freguesia &&
                (body.uso || urlAbsolutePath.includes('/base'))
              ) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}`))
              }
            } else if (regexMunicipios.test(urlAbsolutePath)) {
              if (urlAbsolutePath.includes('/municipios/freguesias')) {
                if (Array.isArray(body) && body.length) {
                  eachCallback()
                } else {
                  console.error(body)
                  eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}, response is not a non-empty Array`))
                }
              } else { // ex: /municipios/lisboa
                if (body.nome) {
                  eachCallback()
                } else {
                  console.error(body)
                  eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}, it has no key 'nome'`))
                }
              }
            } else if (regexFreguesias.test(urlAbsolutePath)) {
              if (urlAbsolutePath.endsWith('/freguesias')) {
                // ex: /municipio/évora/freguesias
                if (body.nome && Array.isArray(body.freguesias)) {
                  eachCallback()
                } else {
                  console.error(body)
                  eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}, response is not a non-empty Array`))
                }
              } else {
                // ex: /municipio/lisboa/freguesia/ajuda
                if (Array.isArray(body) && body.length && body[0].nome && body[0].municipio && body[0].censos2011) {
                  eachCallback()
                } else if (body.nome && body.municipio && body.censos2011) {
                  eachCallback()
                } else {
                  console.error(body)
                  eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}, it has not these keys: 'nome', 'municipio' and 'censos2011'`))
                }
              }
            } else if (regexSections.test(urlAbsolutePath)) {
              if (body.SEC) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response: ${urlAbsolutePath} has no key SEC`))
              }
            } else if (regexSubsections.test(urlAbsolutePath)) {
              if (body.SS) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response: ${urlAbsolutePath} has no key SS`))
              }
            } else if (regexDistritos.test(urlAbsolutePath)) {
              if (Array.isArray(body) && body.length && body[0].distrito && Array.isArray(body[0].municipios)) {
                eachCallback()
              } else if (body.distrito && Array.isArray(body.municipios)) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response: ${urlAbsolutePath} has not these keys: 'distrito' and 'municipios (Array)'`))
              }
            } else if (postalCodeCP4.test(urlAbsolutePath)) {
              if (body.CP4 &&
                  Array.isArray(body.CP3) &&
                  Array.isArray(body.Localidade) &&
                  Array.isArray(body.partes) &&
                  Array.isArray(body.ruas) &&
                  Array.isArray(body.pontos)
              ) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}`))
              }
            } else if (postalCodeCP7.test(urlAbsolutePath)) {
              if (body.CP4 &&
                  body.CP3 &&
                  Array.isArray(body.partes)
              ) {
                eachCallback()
              } else {
                console.error(body)
                eachCallback(Error(`Wrong JSON response on ${urlAbsolutePath}`))
              }
            } else {
              eachCallback()
            }
          }
        })
        .catch(err => {
          console.error(err)
          eachCallback(Error(`\nError on ${url}\n`))
        })
    }).then(() => {
    mainCallback()
  }).catch(err => {
    mainCallback(Error(err))
  })
}
