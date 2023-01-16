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
    ['N_INDIVIDUOS_65_OU_MAIS', 'Nº de indivíduos com 65 ou mais anos de idade'],
    ['N_EDIFICIOS_CLASSICOS_1OU2', 'Nº de Edificios clássicos construídos estruturalmente p/ possuir 1 ou 2 alojamentos'],
    ['N_EDIFICIOS_CLASSICOS_ISOLADOS', 'Nº de Edificios clássicos isolados'],
    ['N_EDIFICIOS_CLASSICOS_GEMIN', 'Nº de Edificios clássicos geminados'],
    ['N_EDIFICIOS_CLASSICOS_EMBANDA', 'Nº de Edificios clássicos em banda'],
    ['N_EDIFICIOS_CLASSICOS_3OUMAIS', 'Nº de Edificios clássicos construídos estruturalmente p/ possuir 3 ou mais alojamentos'],
    ['N_EDIFICIOS_CLASSICOS_OUTROS', 'Nº de Outro tipo de edificio clássico'],
    ['N_EDIFICIOS_EXCLUSIV_RESID', 'Nº de Edifícios exclusivamente residenciais'],
    ['N_EDIFICIOS_PRINCIPAL_RESID', 'Nº de Edifícios principalmente não residenciais'],
    ['N_EDIFICIOS_PRINCIP_NAO_RESID', 'Nº de Edifícios principalmente residenciais'],
    ['N_EDIFICIOS_1OU2_PISOS', 'Nº de Edifícios com 1 ou 2 pisos'],
    ['N_EDIFICIOS_3OU4_PISOS', 'Nº de Edifícios com 3 ou 4 pisos'],
    ['N_EDIFICIOS_5OU_MAIS_PISOS', 'Nº de Edifícios com 5 ou mais pisos'],
    ['N_EDIFICIOS_CONSTR_ANTES_1919', 'Nº de Edifícios construídos antes de 1919'],
    ['N_EDIFICIOS_CONSTR_1919A1945', 'Nº de Edifícios construídos entre 1919 e 1945'],
    ['N_EDIFICIOS_CONSTR_1946A1960', 'Nº de Edifícios construídos entre 1946 e 1960'],
    ['N_EDIFICIOS_CONSTR_1961A1970', 'Nº de Edifícios construídos entre 1961 e 1970'],
    ['N_EDIFICIOS_CONSTR_1971A1980', 'Nº de Edifícios construídos entre 1971 e 1980'],
    ['N_EDIFICIOS_CONSTR_1981A1990', 'Nº de Edifícios construídos entre 1981 e 1990'],
    ['N_EDIFICIOS_CONSTR_1991A1995', 'Nº de Edifícios construídos entre 1991 e 1995'],
    ['N_EDIFICIOS_CONSTR_1996A2000', 'Nº de Edifícios construídos entre 1996 e 2000'],
    ['N_EDIFICIOS_CONSTR_2001A2005', 'Nº de Edifícios construídos entre 2001 e 2005'],
    ['N_EDIFICIOS_CONSTR_2006A2011', 'Nº de Edifícios construídos entre 2006 e 2011'],
    ['N_EDIFICIOS_ESTRUT_BETAO', 'Nº de Edifícios com estrutura de betão armado'],
    ['N_EDIFICIOS_ESTRUT_COM_PLACA', 'Nº de Edifícios com estrutura de paredes de alvenaria com placa'],
    ['N_EDIFICIOS_ESTRUT_SEM_PLACA', 'Nº de Edifícios com estrutura de paredes de alvenaria sem placa'],
    ['N_EDIFICIOS_ESTRUT_ADOBE_PEDRA', 'Nº de Edifícios com estrutura de paredes de adobe ou alvenaria de pedra solta'],
    ['N_EDIFICIOS_ESTRUT_OUTRA', 'Nº de Edifícios com outro tipo de estrutura'],
    ['N_ALOJAMENTOS', 'Nº de Total de Alojamentos'],
    ['N_ALOJAMENTOS_FAMILIARES', 'Nº de Alojamentos familiares'],
    ['N_ALOJAMENTOS_FAM_CLASSICOS', 'Nº de Alojamentos familiares clássicos'],
    ['N_ALOJAMENTOS_FAM_N_CLASSICOS', 'Nº de Alojamentos familiares não clássicos'],
    ['N_ALOJAMENTOS_COLECTIVOS', 'Nº de Alojamentos colectivos'],
    ['N_CLASSICOS_RES_HABITUAL', 'Nº de Alojamentos clássicos de residência habitual'],
    ['N_ALOJAMENTOS_RES_HABITUAL', 'Nº de Alojamentos familiares de residência habitual'],
    ['N_ALOJAMENTOS_VAGOS', 'Nº de Alojamentos familiares vagos'],
    ['N_RES_HABITUAL_COM_AGUA', 'Nº de Alojamentos familiares de residência habitual com água'],
    ['N_RES_HABITUAL_COM_RETRETE', 'Nº de Alojamentos familiares de residência habitual com retrete'],
    ['N_RES_HABITUAL_COM_ESGOTOS', 'Nº de Alojamentos familiares de residência habitual com esgotos'],
    ['N_RES_HABITUAL_COM_BANHO', 'Nº de Alojamentos familiares de residência habitual com banho'],
    ['N_RES_HABITUAL_AREA_50', 'Nº de Alojamentos familiares clássicos de residencia habitual com área até 50 m2'],
    ['N_RES_HABITUAL_AREA_50_100', 'Nº de Alojamentos familiares clássicos de residencia habitual com área de 50 m2 a 100 m2'],
    ['N_RES_HABITUAL_AREA_100_200', 'Nº de Alojamentos familiares clássicos de residencia habitual com área de 100 m2 a 200 m2'],
    ['N_RES_HABITUAL_AREA_200', 'Nº de Alojamentos familiares clássicos de residencia habitual com área maior que 200 m2'],
    ['N_RES_HABITUAL_1_2_DIV', 'Nº de Alojamentos familiares clássicos de residência habitual com 1 ou 2 divisões'],
    ['N_RES_HABITUAL_3_4_DIV', 'Nº de Alojamentos familiares clássicos de residência habitual com 3 ou 4 divisões'],
    ['N_RES_HABITUAL_ESTAC_1', 'Nº de Alojamentos familiares clássicos de residencia habitual com estacionamento p/ 1 veículo'],
    ['N_RES_HABITUAL_ESTAC_2', 'Nº de Alojamentos familiares clássicos de residencia habitual com estacionamento p/ 2 veículos'],
    ['N_RES_HABITUAL_ESTAC_3', 'Nº de Alojamentos familiares clássicos de residencia habitual com estacionamento p/ 3 ou +  veículos'],
    ['N_RES_HABITUAL_PROP_OCUP', 'Nº de Alojamentos familiares clássicos de residência habitual com proprietário ocupante'],
    ['N_RES_HABITUAL_ARREND', 'Nº de Alojamentos familiares clássicos de residência habitual arrendados'],
    ['N_FAMILIAS_CLASSICAS', 'Nº Total de famílias clássicas'],
    ['N_FAMILIAS_INSTITUCIONAIS', 'Nº Total de famílias institucionais'],
    ['N_FAMILIAS_CLASSICAS_1OU2_PESS', 'Nº de Famílias clássicas com 1 ou 2 pessoas'],
    ['N_FAMILIAS_CLASSICAS_3OU4_PESS', 'Nº de Famílias clássicas com 3 ou 4 pessoas'],
    ['N_FAMILIAS_CLASSICAS_NPES65', 'Nº de Famílias clássicas com pessoas com 65 ou mais anos'],
    ['N_FAMILIAS_CLASSICAS_NPES14', 'Nº de Famílias clássicas com pessoas com menos de 15 anos'],
    ['N_FAMILIAS_CLASSIC_SEM_DESEMP', 'Nº de Famílias clássicas sem desempregados'],
    ['N_FAMILIAS_CLASSIC_1DESEMPREG', 'Nº de Famílias clássicas com 1 desempregado'],
    ['N_FAMILIAS_CLASS_2MAIS_DESEMP', 'Nº de Famílias clássicas com + do que 1 desempregado'],
    ['N_NUCLEOS_FAMILIARES', 'Nº Total de núcleos familiares residentes'],
    ['N_NUCLEOS_1FILH_NAO_CASADO', 'Nº de Núcleos com 1 filho não casado'],
    ['N_NUCLEOS_2FILH_NAO_CASADO', 'Nº de Núcleos com 2 filhos não casados'],
    ['N_NUCLEOS_FILH_INF_6ANOS', 'Nº de Núcleos com filhos de idade inferior a 6 anos'],
    ['N_NUCLEOS_FILH_INF_15ANOS', 'Nº de Núcleos c/ filhos c/ menos de 15 anos'],
    ['N_NUCLEOS_FILH_MAIS_15ANOS', 'Nº de Núcleos c/ filhos todos c/ mais de 15 anos'],
    ['N_INDIVIDUOS_PRESENT', 'Nº Total de individuos presentes'],
    ['N_INDIVIDUOS_PRESENT_H', 'Nº Total de homens presentes'],
    ['N_INDIVIDUOS_PRESENT_M', 'Nº Total de mulheres presentes'],
    ['N_INDIVIDUOS_RESIDENT', 'Nº Total de indivíduos residentes'],
    ['N_INDIVIDUOS_RESIDENT_H', 'Nº Total de homens residentes'],
    ['N_INDIVIDUOS_RESIDENT_M', 'Nº Total de mulheres residentes'],
    ['N_INDIVIDUOS_RESIDENT_0A4', 'Nº de Indíviduos residentes com idade entre 0 e 4 anos'],
    ['N_INDIVIDUOS_RESIDENT_5A9', 'Nº de Indíviduos residentes com idade entre 5 e 9 anos'],
    ['N_INDIVIDUOS_RESIDENT_10A13', 'Nº de Indíviduos residentes com idade entre 10 e 13 anos'],
    ['N_INDIVIDUOS_RESIDENT_14A19', 'Nº de Indíviduos residentes com idade entre 14 e 19 anos'],
    ['N_INDIVIDUOS_RESIDENT_15A19', 'Nº de Indíviduos residentes com idade entre 15 e 19 anos'],
    ['N_INDIVIDUOS_RESIDENT_20A24', 'Nº de Indíviduos residentes com idade entre 20 e 24 anos'],
    ['N_INDIVIDUOS_RESIDENT_20A64', 'Nº de Indíviduos residentes com idade entre 20 e 64 anos'],
    ['N_INDIVIDUOS_RESIDENT_25A64', 'Nº de Indíviduos residentes com idade entre 25 e 64 anos'],
    ['N_INDIVIDUOS_RESIDENT_65', 'Nº de Indíviduos residentes com idade superior a 64 anos'],
    ['N_INDIVIDUOS_RESIDENT_H_0A4', 'Nº de Homens residentes com idade entre 0 e 4 anos'],
    ['N_INDIVIDUOS_RESIDENT_H_5A9', 'Nº de Homens residentes com idade entre 5 e 9 anos'],
    ['N_INDIVIDUOS_RESIDENT_H_10A13', 'Nº de Homens residentes com idade entre 10 e 13 anos'],
    ['N_INDIVIDUOS_RESIDENT_H_14A19', 'Nº de Homens residentes com idade entre 14 e 19 anos'],
    ['N_INDIVIDUOS_RESIDENT_H_15A19', 'Nº de Homens residentes com idade entre 15 e 19 anos'],
    ['N_INDIVIDUOS_RESIDENT_H_20A24', 'Nº de Homens residentes com idade entre 20 e 24 anos'],
    ['N_INDIVIDUOS_RESIDENT_H_20A64', 'Nº de Homens residentes com idade entre 20 e 64 anos'],
    ['N_INDIVIDUOS_RESIDENT_H_25A64', 'Nº de Homens residentes com idade entre 25 e 64 anos'],
    ['N_INDIVIDUOS_RESIDENT_H_65', 'Nº de Homens residentes com idade superior a 64 anos'],
    ['N_INDIVIDUOS_RESIDENT_M_0A4', 'Nº de Mulheres residentes com idade entre 0 e 4 anos'],
    ['N_INDIVIDUOS_RESIDENT_M_5A9', 'Nº de Mulheres residentes com idade entre 5 e 9 anos'],
    ['N_INDIVIDUOS_RESIDENT_M_10A13', 'Nº de Mulheres residentes com idade entre 10 e 13 anos'],
    ['N_INDIVIDUOS_RESIDENT_M_14A19', 'Nº de Mulheres residentes com idade entre 14 e 19 anos'],
    ['N_INDIVIDUOS_RESIDENT_M_15A19', 'Nº de Mulheres residentes com idade entre 15 e 19 anos'],
    ['N_INDIVIDUOS_RESIDENT_M_20A24', 'Nº de Mulheres residentes com idade entre 20 e 24 anos'],
    ['N_INDIVIDUOS_RESIDENT_M_20A64', 'Nº de Mulheres residentes com idade entre 20 e 64 anos'],
    ['N_INDIVIDUOS_RESIDENT_M_25A64', 'Nº de Mulheres residentes com idade entre 25 e 64 anos'],
    ['N_INDIVIDUOS_RESIDENT_M_65', 'Nº de Mulheres residentes com idade superior a 64 anos'],
    ['N_INDIV_RESIDENT_N_LER_ESCRV', 'Nº de Indivíduos residentes sem saber ler nem escrever'],
    ['N_IND_RESIDENT_FENSINO_1BAS', 'Nº de Indivíduos residentes a frequentar o 1º ciclo do ensino básico'],
    ['N_IND_RESIDENT_FENSINO_2BAS', 'Nº de Indivíduos residentes a frequentar o 2º ciclo do ensino básico'],
    ['N_IND_RESIDENT_FENSINO_3BAS', 'Nº de Indivíduos residentes a frequentar o 3º ciclo do ensino básico'],
    ['N_IND_RESIDENT_FENSINO_SEC', 'Nº de Indivíduos residentes a frequentar o ensino secundário'],
    ['N_IND_RESIDENT_FENSINO_POSSEC', 'Nº de Individuos residentes a frequentar o ensino pós-secundário'],
    ['N_IND_RESIDENT_FENSINO_SUP', 'Nº de Indivíduos residentes a frequentar um curso superior'],
    ['N_IND_RESIDENT_ENSINCOMP_1BAS', 'Nº de Indivíduos residentes com o 1º ciclo do ensino básico completo'],
    ['N_IND_RESIDENT_ENSINCOMP_2BAS', 'Nº de Indivíduos residentes com o 2º ciclo do ensino básico completo'],
    ['N_IND_RESIDENT_ENSINCOMP_3BAS', 'Nº de Indivíduos residentes com o 3º ciclo do ensino básico completo'],
    ['N_IND_RESIDENT_ENSINCOMP_SEC', 'Nº de Indivíduos residentes com o ensino secundário completo'],
    ['N_IND_RESIDENT_ENSINCOMP_POSEC', 'Nº de Individuos residentes com o ensino pós-secundário'],
    ['N_IND_RESIDENT_ENSINCOMP_SUP', 'Nº de Indivíduos residentes com um curso superior completo'],
    ['N_IND_RESID_DESEMP_PROC_1EMPRG', 'Nº de Indivíduos residentes desempregados à procura do 1º emprego'],
    ['N_IND_RESID_DESEMP_PROC_EMPRG', 'Nº de Indivíduos residentes desempregados à procura de novo emprego'],
    ['N_IND_RESID_EMPREGADOS', 'Nº de Indivíduos residentes empregados'],
    ['N_IND_RESID_PENS_REFORM', 'Nº de Indivíduos residentes pensionistas ou reformados'],
    ['N_IND_RESID_SEM_ACT_ECON', 'Nº de Indivíduos residentes sem actividade económica'],
    ['N_IND_RESID_EMPREG_SECT_PRIM', 'Nº de Indivíduos residentes empregados no sector primário'],
    ['N_IND_RESID_EMPREG_SECT_SEQ', 'Nº de Indivíduos residentes empregados no sector secundário'],
    ['N_IND_RESID_EMPREG_SECT_TERC', 'Nº de Indivíduos residentes empregados no sector terciário'],
    ['N_IND_RESID_ESTUD_MUN_RESID', 'Nº de Indivíduos residentes a estudarem no municipio de residência'],
    ['N_IND_RESID_TRAB_MUN_RESID', 'Nº de Indivíduos residentes  a trabalharem no municipio de residência']
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
