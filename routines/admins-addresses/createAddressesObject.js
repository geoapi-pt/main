/* Piscina worker */
const fs = require('fs')
const path = require('path')
const async = require('async')
const proj4 = require('proj4')
const appRoot = require('app-root-path')
const PolygonLookup = require('polygon-lookup')

const censosGeojsonDir = path.join(appRoot.path, 'res', 'censos', 'geojson', '2021')

const { normalizeName } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'commonFunctions.js'))

module.exports = async ({ openAddressesDataChunk, regions, administrations }) => {
  return await processChunk({ openAddressesDataChunk, regions, administrations })
}

function processChunk ({ openAddressesDataChunk, regions, administrations }) {
  return new Promise((resolve, reject) => {
    const addressesPerBGRI2021 = {}
    async.eachLimit(openAddressesDataChunk, 100,
      (addr, callback) => {
        try {
          let res
          if (addr.lon && addr.lat) {
            const lon = parseFloat(addr.lon)
            const lat = parseFloat(addr.lat)

            res = getAdminsByCoord({ regions, administrations, lon, lat })

            if (res && res.BGRI2021) {
              if (!addressesPerBGRI2021[res.BGRI2021]) {
                addressesPerBGRI2021[res.BGRI2021] = {}
                addressesPerBGRI2021[res.BGRI2021].data = res
                addressesPerBGRI2021[res.BGRI2021].addresses = [addr]
              } else {
                addressesPerBGRI2021[res.BGRI2021].addresses.push(addr)
              }
            }
          }
          callback()
        } catch (err) {
          console.error(err)
          callback(Error(err))
        }
      },
      (err) => {
        if (err) {
          reject(Error(err))
        } else {
          resolve(addressesPerBGRI2021)
        }
      }
    )
  })
}

function getAdminsByCoord ({ regions, administrations, lon, lat }) {
  const local = {}
  const point = [lon, lat] // longitude, latitude
  let municipalityIneCode

  for (const key in regions) {
    const transformedPoint = proj4(regions[key].projection, point)

    const lookupFreguesias = new PolygonLookup(regions[key].geojson)
    const freguesia = lookupFreguesias.search(transformedPoint[0], transformedPoint[1])

    if (freguesia) {
      local.ilha = freguesia.properties.Ilha
      local.distrito = freguesia.properties.Distrito
      local.concelho = freguesia.properties.Concelho
      local.freguesia = freguesia.properties.Freguesia

      // search for details for municipalities by name
      const numberOfMunicipalities = administrations.municipalitiesDetails.length
      const municipality = normalizeName(freguesia.properties.Concelho)
      for (let i = 0; i < numberOfMunicipalities; i++) {
        if (municipality === normalizeName(administrations.municipalitiesDetails[i].nome)) {
          municipalityIneCode = administrations.municipalitiesDetails[i].codigoine
          break // found it, break loop
        }
      }

      break
    }
  }

  if (!local.freguesia || !municipalityIneCode) {
    return null
  }

  // files pattern like BGRI2021_0211.json
  // BGRI => Base Geográfica de Referenciação de Informação (INE, 2021)
  const file = `BGRI2021_${municipalityIneCode.toString().padStart(4, '0')}.json`
  const geojsonFilePath = path.join(censosGeojsonDir, file)
  if (fs.existsSync(geojsonFilePath)) {
    const geojsonData = JSON.parse(fs.readFileSync(geojsonFilePath))
    const lookupBGRI = new PolygonLookup(geojsonData)
    const subSecction = lookupBGRI.search(lon, lat)
    if (subSecction) {
      Object.assign(local, subSecction.properties)
      delete local.N_EDIFICIOS_CLASSICOS
      delete local.N_ALOJAMENTOS
      delete local.N_AGREGADOS
      delete local.N_INDIVIDUOS_RESIDENT
    }
  }

  return local
}
