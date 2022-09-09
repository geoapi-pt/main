/* Worker that is called by module piscina in generatePostalCodes.js, thus to be run with multi-threads */

const fs = require('fs')
const path = require('path')
const Piscina = require('piscina')
const turf = require('@turf/turf')
const debug = require('debug')('geoapipt:generate-postal-codes')

const piscina = new Piscina({
  filename: path.resolve(__dirname, 'outliersWorker.js')
})

module.exports = { createCP4CP3jsonFile, createCP4jsonFile }

// creates one CP3 json file inside respective CP4 directory: XXXX/YYY.json
function createCP4CP3jsonFile (resDirectory, postalCode, cttData, openAddressesData, callback) {
  const postalCodeObj = {}
  postalCodeObj.CP = postalCode // CP4-CP3 format: 'XXXX-YYY'

  const CP4 = splitCP(postalCode).CP4
  const CP3 = splitCP(postalCode).CP3
  postalCodeObj.CP4 = CP4
  postalCodeObj.CP3 = CP3

  const filename = path.join(resDirectory, 'data', CP4, CP3 + '.json')

  // points fetched from OpenAddresses data file, such points corresponding to this postal code
  const pontos = []

  try {
    // fetch data from CTT file
    let partes = cttData
      .filter(el => el.CP && el.CP === postalCode)
      .map(el => {
        // clone object to avoid damaging Objects in cttData (in JS Objects are references/pointers)
        const clone = { ...el } // clone Object
        delete clone.CP
        delete clone.CP4
        delete clone.CP3
        return clone
      });

    // if these keys are the same for all "partes" move them to root of postalCodeObj
    ['Distrito', 'Concelho', 'Localidade', 'Designação Postal'].forEach(key => {
      const results = removeDuplicatesFromArray(partes.map(el => el[key]))
      if (results.length === 1) {
        postalCodeObj[key] = results[0]
        partes = partes.map(el => { delete el[key]; return el })
      } else {
        postalCodeObj[key] = results
      }
    })

    postalCodeObj.partes = partes

    // merges data from OpenAddresses into the CTT data object
    const openAddressesDataLen = openAddressesData.length
    for (let i = 0; i < openAddressesDataLen; i++) {
      if (postalCode === openAddressesData[i].postcode) {
        pontos.push({
          id: openAddressesData[i].id,
          rua: openAddressesData[i].street,
          casa: openAddressesData[i].house,
          coordenadas: [
            parseFloat(openAddressesData[i].lat),
            parseFloat(openAddressesData[i].lon)
          ]
        })
      }
    }

    postalCodeObj.pontos = pontos

    // get unique arrays of streets
    const streets = pontos.map(local => local.rua).filter(street => street.trim())
    postalCodeObj.ruas = removeDuplicatesFromArray(streets)

    if (
      pontos.every(local =>
        Number.isFinite(local.coordenadas[0]) && Number.isFinite(local.coordenadas[1])
      )
    ) {
      if (pontos.length === 1) {
        // just 1 point, center is that single point
        const centro = pontos[0].coordenadas
        postalCodeObj.centro = postalCodeObj.centroide = postalCodeObj.centroDeMassa = centro
      } else if (pontos.length === 2) {
        // just 2 points, calculates center
        const points = turf.points(pontos.map(local => [local.coordenadas[0], local.coordenadas[1]]))
        const geojsonCenter = turf.center(points)
        const centro = geojsonCenter.geometry.coordinates
        postalCodeObj.centro = postalCodeObj.centroide = postalCodeObj.centroDeMassa = centro
      } else if (pontos.length > 2) {
        // computes center from set of points
        // computes also corresponding convex hull polygon
        // from hull polygon, computes centroid and center of mass
        // https://en.wikipedia.org/wiki/Convex_hull_of_a_simple_polygon
        // https://github.com/jfoclpf/geoapi.pt/issues/27#issuecomment-1222236088
        // https://stackoverflow.com/a/61162868/1243247

        // converts to geojson object
        const points = turf.points(pontos.map(local => [local.coordenadas[0], local.coordenadas[1]]))

        // computes center
        const geojsonCenter = turf.center(points)
        postalCodeObj.centro = geojsonCenter.geometry.coordinates

        // computes convex hull polygon, the minimum polygon than embraces all the points
        const hullPolygon = turf.convex(points)
        if (hullPolygon && hullPolygon.geometry.type === 'Polygon') {
          const geojsonSmoothPolygon = turf.polygonSmooth(hullPolygon, { iterations: 3 })
          try {
            postalCodeObj.poligono = geojsonSmoothPolygon.features[0].geometry.coordinates[0]
          } catch (e) {}

          // computes centroide and center of mass from hull polygon
          postalCodeObj.centroide = turf.centroid(hullPolygon).geometry.coordinates
          postalCodeObj.centroDeMassa = turf.center(hullPolygon).geometry.coordinates
        } else {
          postalCodeObj.centroide = postalCodeObj.centroDeMass = postalCodeObj.centro
        }
      }
    }

    fs.rmSync(filename, { force: true })
    fs.writeFile(filename, JSON.stringify(postalCodeObj, null, 2), function (err) {
      if (err) {
        console.error('Error creating file ' + filename)
        throw err
      } else {
        callback()
      }
    })
  } catch (err) {
    console.error(`\nError on ${postalCode}. ${err.message}.`, err)
    console.error('\npontos (from OpenAddresses) for this postalCode: ', pontos)
    callback(Error(err))
  }
}

// creates one CP4 json file: XXXX.json
async function createCP4jsonFile (resDirectory, CP4postalCode, cttData, openAddressesData, callback) {
  const postalCodeObj = {}
  postalCodeObj.CP4 = CP4postalCode

  const filename = path.join(resDirectory, 'data', CP4postalCode + '.json')

  // points fetched from OpenAddresses data file, such points corresponding to this CP4
  const pontos = []
  let pointsArr = []

  try {
    // fetch data from CTT file
    let partes = cttData
      .filter(el => el.CP4 && el.CP4 === CP4postalCode)
      .map(el => {
        // clone object to avoid damaging Objects in cttData (in JS Objects are references/pointers)
        const clone = { ...el } // clone Object
        delete clone.CP
        delete clone.CP4
        return clone
      });

    // if these keys are the same for all "partes" ("partes" is an array of Objs) move them to root postalCodeObj
    // even if they are different amongst "partes", create an array in root postalCodeObj with unique values
    ['CP3', 'Distrito', 'Concelho', 'Localidade', 'Designação Postal'].forEach(key => {
      const results = removeDuplicatesFromArray(partes.map(el => el[key]))
      if (results.length === 1) {
        // move key to main Obj and remove the key form "partes" array of Objs
        postalCodeObj[key] = results[0]
        partes = partes.map(el => { const clone = { ...el }; delete clone[key]; return clone })
      } else {
        // although the key is different in "partes", create an array in main Obj with unique values
        // particularly important for CP3
        postalCodeObj[key] = results
      }
    })

    // remove empty keys from "partes" to compress JSON file
    partes.forEach(obj => {
      for (const key in obj) {
        if (!obj[key]) delete obj[key]
      }
    })

    postalCodeObj.partes = partes

    // merges data from OpenAddresses into the CTT data object
    const openAddressesDataLen = openAddressesData.length
    for (let i = 0; i < openAddressesDataLen; i++) {
      if (CP4postalCode === splitCP(openAddressesData[i].postcode).CP4) {
        pontos.push({
          id: openAddressesData[i].id,
          rua: openAddressesData[i].street,
          casa: openAddressesData[i].house,
          coordenadas: [
            parseFloat(openAddressesData[i].lat),
            parseFloat(openAddressesData[i].lon)
          ]
        })
      }
    }

    // get unique arrays of streets
    const streets = pontos.map(local => local.rua).filter(street => street.trim())
    postalCodeObj.ruas = removeDuplicatesFromArray(streets)

    if (
      pontos.every(local =>
        Number.isFinite(local.coordenadas[0]) && Number.isFinite(local.coordenadas[1])
      )
    ) {
      if (pontos.length === 1) {
        // just 1 point, center is that single point
        const centro = pontos[0].coordenadas
        postalCodeObj.centro = postalCodeObj.centroide = postalCodeObj.centroDeMassa = centro
      } else if (pontos.length === 2) {
        // just 2 points, calculates center
        const points = turf.points(pontos.map(local => [local.coordenadas[0], local.coordenadas[1]]))
        const geojsonCenter = turf.center(points)
        const centro = geojsonCenter.geometry.coordinates
        postalCodeObj.centro = postalCodeObj.centroide = postalCodeObj.centroDeMassa = centro
      } else if (pontos.length > 2) {
        // computes center from set of points
        // computes also corresponding convex hull polygon
        // from hull polygon, computes centroid and center of mass
        // https://en.wikipedia.org/wiki/Convex_hull_of_a_simple_polygon
        // https://github.com/jfoclpf/geoapi.pt/issues/27#issuecomment-1222236088
        // https://stackoverflow.com/a/61162868/1243247

        // converts to, f.ex: [[1,2],[3,4]]
        pointsArr = pontos.map(local => [local.coordenadas[0], local.coordenadas[1]])

        // strip outliers
        // const filteredPoints = outliers2d(pointsArr).filteredPoints
        debug(`running DBSCAN on CP4 ${CP4postalCode}. ${pointsArr.length} points`)
        const filteredPoints = await piscina.run({ pointsArr, CP4postalCode })
        debug(`filteredPoints array has ${filteredPoints.length} points`)
        debug(`runned DBSCAN for CP4 ${CP4postalCode}`)
        if (Array.isArray(filteredPoints) && filteredPoints.length > 10) {
          pointsArr = filteredPoints
        }

        // converts to geojson object
        const geojsonPoints = turf.points(pointsArr)

        // computes center
        const geojsonCenter = turf.center(geojsonPoints)
        postalCodeObj.centro = geojsonCenter.geometry.coordinates

        // computes convex hull polygon, the minimum polygon than embraces all the points
        const hullPolygon = turf.concave(geojsonPoints)
        if (hullPolygon && hullPolygon.geometry.type === 'Polygon') {
          const geojsonSmoothPolygon = turf.polygonSmooth(hullPolygon, { iterations: 3 })
          try {
            postalCodeObj.poligono = geojsonSmoothPolygon.features[0].geometry.coordinates[0]
          } catch (e) {}

          // computes centroide and center of mass from hull polygon
          postalCodeObj.centroide = turf.centroid(hullPolygon).geometry.coordinates
          postalCodeObj.centroDeMassa = turf.center(hullPolygon).geometry.coordinates
        } else {
          postalCodeObj.centroide = postalCodeObj.centroDeMass = postalCodeObj.centro
        }
      }
    }

    // remove unecessary keys to compress json file
    pontos.forEach(ponto => {
      delete ponto.id // some INE id, not needed
      if (!ponto.rua) delete ponto.rua
      if (!ponto.casa) delete ponto.casa
    })

    postalCodeObj.pontos = pontos

    fs.rmSync(filename, { force: true })
    fs.writeFile(filename, JSON.stringify(postalCodeObj), function (err) {
      if (err) {
        console.error('Error creating file ' + filename)
        throw err
      } else {
        callback()
      }
    })
  } catch (err) {
    console.error(`\nError on ${CP4postalCode}. ${err.message}.`, err)
    console.error('\npointsArr: ', pointsArr)
    callback(Error(err))
  }
}

function removeDuplicatesFromArray (array) {
  return [...new Set(array)]
}

function splitCP (str) {
  // any sort of hyphen, dash or minus sign
  const CP = str.split(/\p{Dash}/u)
  return { CP4: CP[0], CP3: CP[1] }
}
