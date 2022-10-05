const colors = require('colors/safe')

module.exports = ({ serverPort, gitProjectUrl }) => {
  console.log('Listening on port ' + serverPort)
  console.log('To stop server press ' + colors.red.bold('CTRL+C') + '\n')
  console.log('*******************************************************************************')
  console.log('**                             GEO API PT                                    **')
  console.log(`**${Array(16).join(' ')}can be now accessed on ${colors.green.bold('localhost:' + serverPort) + Array(24).join(' ')}**`)
  console.log('**                                                                           **')
  console.log('**     Examples:                                                             **')
  console.log(`**${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/gps/40.153687,-8.514602')}${Array(26).join(' ')}**`)
  console.log(`**${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/municipios/évora')}${Array(34).join(' ')}**`)
  console.log(`**${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/cp/2495-300')}${Array(38).join(' ')}**`)
  console.log(`**${Array(6).join(' ')}${colors.green.bold('http://localhost:' + serverPort + '/cp/1950')}${Array(42).join(' ')}**`)
  console.log('**                                                                           **')
  console.log(`**          for instructions see ${colors.cyan.bold(gitProjectUrl)}${Array(23).join(' ')}**`)
  console.log('*******************************************************************************')
}
