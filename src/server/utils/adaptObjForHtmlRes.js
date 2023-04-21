/* Rename and order keys for presenting HTML results, for better user friendly display
   Also adds links according to the type of data */

const fs = require('fs')
const path = require('path')

const { correctCase, isValidPostalCode } = require(path.join(__dirname, 'commonFunctions.js'))

// Rename keys for a more user friendly html/text result
// Mapping from JSON result to HTML view result
// This mapping also sets the order
const keysMapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'keysMaping.json')))

module.exports = (obj) => {
  loopThroughObjRecurs(obj, (_obj) => {
    keysMapping.forEach(mapEl => renameObjKey(_obj, mapEl[0], mapEl[1]))
  });

  // correct case of some fields
  ['Distrito', 'Localidade', 'Descrição Postal'].forEach(el => {
    if (isValidString(obj[el])) {
      obj[el] = correctCase(obj[el])
    }
  })

  // add links accordingly
  if (isValidString(obj.Distrito)) {
    const distrito = obj.Distrito
    obj.Distrito = `<a href="/distrito/${adaptUrlVar(distrito)}">${correctCase(distrito)}</a>`
  }

  if (isValidString(obj['Município'])) {
    const municipality = obj['Município']
    obj['Município'] = `<a href="/municipio/${adaptUrlVar(municipality)}">${correctCase(municipality)}</a>`

    if (isValidString(obj.Freguesia)) {
      const parish = obj.Freguesia
      obj.Freguesia =
        `<a href="/municipio/${adaptUrlVar(municipality)}/freguesia/${parish}">${correctCase(parish)}</a>`

      if (isValidString(obj['Secção Estatística'])) {
        const section = obj['Secção Estatística']
        obj['Secção Estatística'] =
        `<a href="/municipio/${adaptUrlVar(municipality)}/freguesia/${parish}/sec/${section}">${section}</a>`

        if (isValidString(obj['Subsecção Estatística'])) {
          const subsection = obj['Subsecção Estatística']
          obj['Subsecção Estatística'] =
          `<a href="/municipio/${adaptUrlVar(municipality)}/freguesia/${parish}/sec/${section}/ss/${subsection}">${subsection}</a>`
        }
      }
    }
  }

  if (isValidPostalCode(obj['Código Postal'])) {
    const CP = obj['Código Postal']
    obj['Código Postal'] = `<a href="/cp/${CP}">${CP}</a>`
  }

  if (isValidString(obj['Sítio'])) {
    const host = obj['Sítio'].replace(/^http?:\/\//, '').trim()
    obj['Sítio'] = `<a href="//${host}">${host}</a>`
  }

  // Use keysMapping as the order template; that is, order keys according to order on keysMapping
  const objectOrder = {}
  keysMapping.forEach(key => { objectOrder[key[1]] = null })
  obj = Object.assign(objectOrder, obj)

  // sanitize obj
  for (const key in obj) {
    if (!obj[key]) {
      delete obj[key]
    }
  }

  return obj
}

function renameObjKey (obj, oldKey, newKey) {
  if (obj[oldKey]) {
    if (oldKey !== newKey) {
      Object.defineProperty(obj, newKey,
        Object.getOwnPropertyDescriptor(obj, oldKey)
      )
      delete obj[oldKey]
    }
  } else {
    delete obj[oldKey]
  }
}

// recursive function with an Object execute function
function loopThroughObjRecurs (obj, objExec) {
  objExec(obj)
  for (const k in obj) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      loopThroughObjRecurs(obj[k], objExec)
    }
  }
}

function isValidString (str) {
  return str && typeof str === 'string'
}

function adaptUrlVar (str) {
  return encodeURIComponent(str.toLowerCase())
}
