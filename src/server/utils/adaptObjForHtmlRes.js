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
    ['carta_solo', 'Carta de Uso e Utilização do Solo'],
    ['N_EDIFICIOS_CLASSICOS', 'Nº de edifícios clássicos'],
    ['N_EDIFICIOS_CLASS_CONST_1_OU_2_ALOJ', 'Nº de edifícios clássicos, construídos para ter 1 ou 2 alojamentos'],
    ['N_EDIFICIOS_CLASS_CONST_3_OU_MAIS_ALOJAMENTOS', 'Nº de edifícios clássicos, construídos para ter 3 ou mais alojamentos'],
    ['N_EDIFICIOS_EXCLUSIV_RESID', 'Nº de edifícios exclusivamente residenciais'],
    ['N_EDIFICIOS_1_OU_2_PISOS', 'Nº de edificios com 1 ou 2 pisos'],
    ['N_EDIFICIOS_3_OU_MAIS_PISOS', 'Nº de edificios com 3 ou mais pisos'],
    ['N_EDIFICIOS_CONSTR_ANTES_1945', 'Nº de edificios construídos antes de 1945'],
    ['N_EDIFICIOS_CONSTR_1946_1980', 'Nº de edificios construídos entre 1946 e 1980'],
    ['N_EDIFICIOS_CONSTR_1981_2000', 'Nº de edificios construídos entre 1981 e 2000'],
    ['N_EDIFICIOS_CONSTR_2001_2010', 'Nº de edificios construídos entre 2001 e 2010'],
    ['N_EDIFICIOS_CONSTR_2011_2021', 'Nº de edificios construídos entre 2011 e 2021'],
    ['N_EDIFICIOS_COM_NECESSIDADES_REPARACAO', 'Nº de edificios com necessidades de reparação'],
    ['N_ALOJAMENTOS_TOTAL', 'Nº de alojamentos total'],
    ['N_ALOJAMENTOS_FAMILIARES', 'Nº de alojamentos familiares'],
    ['N_ALOJAMENTOS_FAM_CLASS_RHABITUAL', 'Nº de alojamentos familiares clássicos de residência habitual'],
    ['N_ALOJAMENTOS_FAM_CLASS_VAGOS_OU_RESID_SECUNDARIA', 'Nº de alojamentos familiares clássicos vagos ou de residência secundária'],
    ['N_RHABITUAL_ACESSIVEL_CADEIRAS_RODAS', 'Nº de alojamentos familiares clássicos de residência habitual acessíveis a cadeira de rodas'],
    ['N_RHABITUAL_COM_ESTACIONAMENTO', 'Nº de alojamentos familiares clássicos de residência habitual com estacionamento'],
    ['N_RHABITUAL_PROP_OCUP', 'Nº de alojamentos familiares clássicos de residência habitual propriedade dos ocupantes'],
    ['N_RHABITUAL_ARRENDADOS', 'Nº de alojamentos familiares clássicos de residência habitual arrendados'],
    ['N_AGREGADOS_DOMESTICOS_PRIVADOS', 'Nº de agregados domésticos privados'],
    ['N_ADP_1_OU_2_PESSOAS', 'Nº de agregados domésticos privados com 1 ou 2 pessoas'],
    ['N_ADP_3_OU_MAIS_PESSOAS', 'Nº de agregados domésticos privados com 3 ou mais pessoas'],
    ['N_NUCLEOS_FAMILIARES', 'Nº de núcleos familiares'],
    ['N_NUCLEOS_FAMILIARES_COM_FILHOS_TENDO_O_MAIS_NOVO_MENOS_DE_25', 'Nº de núcleos familiares com filhos, tendo o mais novo menos de 25 anos'],
    ['N_INDIVIDUOS', 'Nº total de indivíduos'],
    ['N_INDIVIDUOS_H', 'Nº de indivíduos do sexo masculino'],
    ['N_INDIVIDUOS_M', 'Nº de indivíduos do sexo feminino'],
    ['N_INDIVIDUOS_0_14', 'Nº de indivíduos com idade entre os 0 e os 14 anos'],
    ['N_INDIVIDUOS_15_24', 'Nº de indivíduos com idade entre os 15 e os 24 anos'],
    ['N_INDIVIDUOS_25_64', 'Nº de indivíduos com idade entre os 25 e os 64 anos'],
    ['N_INDIVIDUOS_65_OU_MAIS', 'Nº de indivíduos com 65 ou mais anos de idade']
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
