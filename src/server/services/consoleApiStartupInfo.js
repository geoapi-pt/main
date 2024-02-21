const colors = require('colors/safe')

module.exports = ({ serverPort }) => {
  console.log('Listening on port ' + serverPort)
  console.log('To stop server press ' + colors.red.bold('CTRL+C') + '\n')
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗')
  console.log('║                             GEO API PT                                    ║')
  console.log(`║${Array(16).join(' ')}can be now accessed on ${colors.green.bold('http://localhost:' + serverPort) + Array(17).join(' ')}║`)
  console.log('║                                                                           ║')
  console.log('║     Examples:                                                             ║')
  console.log(`║${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/gps/40.153687,-8.514602')}${Array(26).join(' ')}║`)
  console.log(`║${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/municipio/évora')}${Array(34).join(' ')}║`)
  console.log(`║${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/codigo_postal/2495-300')}${Array(27).join(' ')}║`)
  console.log(`║${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/codigo_postal/1950')}${Array(31).join(' ')}║`)
  console.log('║                                                                           ║')
  console.log(`║${Array(6).join(' ')}for instructions see ${colors.cyan.bold('http://localhost:' + serverPort + '/docs')}${Array(24).join(' ')}║`)
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝')
}
