/*
  script that runs a http server on localhost and then html-validates
  using a LOCAL html validator for all the html pages served
*/

console.log('Validating html/hbs pages using local html validator (html-validate)...')

const TEST_PORT = 8082

const path = require('path')
const async = require('async')
const got = require('got')
const colors = require('colors')
const util = require('util')
const appRoot = require('app-root-path')
const ProgressBar = require('progress')
const debug = require('debug')('test:validateHtml')

const HTMLValidate = require('html-validate').HtmlValidate
const htmlvalidate = new HTMLValidate({
  extends: ['html-validate:recommended'],
  rules: {
    'no-trailing-whitespace': 'off',
    'long-title': 'off'
  }
})

const testServer = require(path.join(__dirname, 'serverForTests'))

// Array of url paths whose html is to validate
const openapiFilePath = path.join(appRoot.path, 'src', 'public', 'src', 'openapi.yaml')
const pathnamesToValidateArr = require(path.join(__dirname, 'openApiPaths'))(openapiFilePath)

// add paths which are not in openapi.yaml because they are not API related, they are only HTML related
pathnamesToValidateArr.push(...['/'])

const bar = new ProgressBar('[:bar] :percent :info', { total: pathnamesToValidateArr.length + 1, width: 80 })

async.series([startsHttpServer, validateHtmlOnAllPages],
  // done after execution of above funcitons
  function (err, results) {
    testServer.closeServer()

    bar.tick({ info: '' })
    bar.terminate()

    if (err) {
      console.error(Error(err))
      process.exitCode = 1
    } else {
      console.log(colors.green('All html/hbs pages validated OK\n'))
      process.exitCode = 0
    }
  }
)

// starts http server on localhost on test default port
function startsHttpServer (callback) {
  console.time('timeToTestServer')
  console.log('Please wait for server to start on...')

  testServer.startsServerForTests(
    ['--port', TEST_PORT],
    function () {
      console.log('server started')
      callback()
    }, function (err) {
      console.error(err)
      callback(Error(err))
    })
}

// validates html code of pages using validator.w3.org/nu
function validateHtmlOnAllPages (next) {
  async.eachOfSeries(pathnamesToValidateArr, validatePage, function (err) {
    if (err) {
      next(Error('\nError validating html on some pages.' + err.message))
    } else {
      debug('All html pages validated')
      next()
    }
  })
}

function validatePage (pathname, key, callback) {
  const url = encodeURI(`http://localhost:${TEST_PORT}${pathname}`)
  got(url)
    .text()
    .then(body => {
      if (!body) {
        callback(Error('error on url: ' + url))
        return
      }

      const report = htmlvalidate.validateString(body)
      if (!report.valid) {
        console.error('\n\nError on ' + colors.red.bold(pathname))
        console.error('ERROR COUNT: ', report.results[0].errorCount)
        console.error(util.inspect(report.results[0].messages, false, null, true /* enable colors */))
        console.error(addLinesToStr(body))
        console.error('\nError on ' + colors.red.bold(pathname))
        callback(Error(('Package html-validate found ' + report.results[0].errorCount + ' HTML errors on ' + pathname).error))
      } else {
        debug(pathname)
        bar.tick({ info: pathname })
        callback()
      }
    })
    .catch(err => {
      callback(Error(err.message + ', error on url: ' + url))
    })
}

// for debug purposes. On a big string of code with many breaklines,
// adds after a breakline, the correspondig line number
// from "abc\ndef\nghi" => "1: abc\n 2: def\n 3: ghi"
function addLinesToStr (str) {
  const arr = str.split('\n')
  for (let i = 0; i < arr.length; i++) {
    arr[i] = (i + 1).toString().padStart(4, ' ') + ':  ' + arr[i] + '\n'
  }
  return arr.join('')
}
