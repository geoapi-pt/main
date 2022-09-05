// gracefully exiting upon CTRL-C or when PM2 stops the process
module.exports = function (signal, server) {
  if (signal) console.log(`\nReceived signal ${signal}`)
  console.log('Gracefully closing http server')

  // closeAllConnections() is only available after Node v18.02
  if (server.closeAllConnections) server.closeAllConnections()
  else setTimeout(() => process.exit(0), 5000)

  try {
    server.close(function (err) {
      if (err) {
        console.error('There was an error', err)
        process.exit(1)
      } else {
        console.log('http server closed successfully. Exiting!')
        process.exit(0)
      }
    })
  } catch (err) {
    console.error('There was an error', err)
    setTimeout(() => process.exit(1), 500)
  }
}
