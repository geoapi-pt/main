/* Rename and order keys for presenting HTML results, for better user friendly display
   Also adds links according to the type of data */

const path = require('path')

const { correctCase, isValidPostalCode } = require(path.join(__dirname, 'commonFunctions.js'))

module.exports = (obj) => {
  // Rename keys for a more user friendly html/text result
  // Mapping from JSON result to HTML view result
  // This mapping also sets the order
  const keysMapping = [
    ['nome', 'Nome'],
    ['nome_alternativo', 'Nome Alternativo'],
    ['nomecompleto', 'Nome Completo'],
    ['nomecompleto2', 'Nome Completo (2)'],
    ['nomecompleto3', 'Nome Completo (3)'],
    ['ID', 'Identificador'],
    ['ilha', 'Ilha'],
    ['distrito', 'Distrito'],
    ['concelho', 'Município'],
    ['municipio', 'Município'],
    ['freguesia', 'Freguesia'],
    ['Secção Estatística (INE, BGRI 2021)', 'Secção Estatística (INE, BGRI 2021)'],
    ['Subsecção Estatística (INE, BGRI 2021)', 'Subsecção Estatística (INE, BGRI 2021)'],
    ['rua', 'Rua/Artéria'],
    ['n_porta', 'Nr. de porta'],
    ['uso', 'Uso e Utilização do Solo'],
    ['altitude_m', 'Altitude (m)'],
    ['CP', 'Código Postal'],
    ['codigopostal', 'Código Postal'],
    ['descr_postal', 'Descrição Postal'],
    ['sitio', 'Sítio'],
    ['populacao', 'População'],
    ['populacao2011', 'População (2011)'],
    ['eleitores2011', 'Eleitores (2011)'],
    ['codigo', 'Código'],
    ['nif', 'NIF'],
    ['localidade', 'Localidade'],
    ['descrpostal', 'Descrição Postal'],
    ['email', 'E-mail'],
    ['telefone', 'Telefone'],
    ['fax', 'Fax'],
    ['areaha', 'Área (ha)'],
    ['Area_ha', 'Área (ha)'],
    ['eleitores', 'Eleitores'],
    ['codigoine', 'Código INE'],
    ['detalhesFreguesia', 'Detalhes da Freguesia'],
    ['detalhesMunicipio', 'Detalhes do Município'],
    ['censos2011', 'Censos (2011)'],
    ['censos2021', 'Censos (2021)'],
    ['centros', 'Centros'],
    ['carta_solo', 'Carta de Uso e Utilização do Solo']
  ]

  loopThroughObjRecurs(obj, (_obj) => {
    keysMapping.forEach(mapEl => renameObjKey(_obj, mapEl[0], mapEl[1]))
  });

  // correct case of some fields
  ['Distrito', 'Localidade', 'Descrição Postal'].forEach(el => {
    if (obj[el] && typeof obj[el] === 'string') {
      obj[el] = correctCase(obj[el])
    }
  })

  // add links accordingly
  /* route not yet implemented
  if (obj.Distrito) {
    const distrito = obj.Distrito
    obj.Distrito = `<a href="/distrito/${adaptUrlVar(distrito)}">${correctCase(distrito)}</a>`
  } */

  if (isValidString(obj['Município'])) {
    const municipality = obj['Município']
    obj['Município'] = `<a href="/municipio/${adaptUrlVar(municipality)}">${correctCase(municipality)}</a>`

    if (isValidString(obj.Freguesia)) {
      const parish = obj.Freguesia
      obj.Freguesia =
        `<a href="/municipio/${adaptUrlVar(municipality)}/freguesia/${parish}">${correctCase(parish)}</a>`
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
