// gracefully exiting upon CTRL-C or when PM2 stops the process
module.exports = function (signal, server, dbPool) {
  if (signal) console.log(`\nReceived signal ${signal}`)
  console.log('Gracefully closing HTTP server and DB connections')

  // closeAllConnections() is only available after Node v18.02
  if (server.closeAllConnections) server.closeAllConnections()
  else setTimeout(() => process.exit(0), 5000)

  try {
    server.close(function (err) {
      if (err) {
        console.error('Error closing the HTTP server', err)
        process.exit(1)
      } else {
        console.log('HTTP server closed successfully')
        if (dbPool && dbPool.end) {
          dbPool.end((err) => {
            if (err) {
              console.error('Error closing DB connections', err)
            } else {
              console.log('DB connections closed successfully')
            }
            console.log('Exiting!')
            process.exit(0)
          })
        } else {
          console.log('Exiting!')
          process.exit(0)
        }
      }
    })
  } catch (err) {
    console.error('There was an error', err)
    setTimeout(() => process.exit(1), 500)
  }
}
