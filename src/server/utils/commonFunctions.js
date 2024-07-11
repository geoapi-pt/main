/* functions common to many server modules and routines */

module.exports = { normalizeName, correctCase, isValidPostalCode, convertPerigoIncendio }

// normalize name of parish or name of municipality such that it can be compared
function normalizeName (name) {
  if (typeof name === 'string') {
    return name
      .trim() // removes leading and trailing spaces
      .toLowerCase()
      .replace(/\.(\w)/g, '. $1') // add space after a dot followed by letter: 'N.AB' -> 'N. AB'
      .replace(/\s(dos|das|de|da)\s/g, ' ') // remove words 'dos', 'das', 'de' e 'da'
      .replace(/\s+/g, ' ') // removes excess of whitespaces
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // removes diacritics 'á'->'a', 'ç'->'c'
  } else {
    return null
  }
}

// REGUENGOS DE MONSARAZ => Reguengos de Monzaraz
// VENDAS NOVAS => Vendas Novas
// R. A. MADEIRA => R. A. Madeira
function correctCase (_str) {
  let str = _str.toLowerCase()
    .replace(/\s\s+/g, ' ') // remove excess of spaces

  str = str.split(' ').map((word, index) => {
    if (index === 0 && word.length === 1) {
      if (word === 'r') {
        return 'Rua' // "r fernando..." => "Rua...
      } else {
        return word.toUpperCase()
      }
    } else if (word.length > 2) {
      return word.charAt(0).toUpperCase() + word.slice(1) // capitalize first letter of word
    } else if (word.length === 2 && word.charAt(1) === '.') { // 'r.' => 'R.'
      return word.toUpperCase()
    } else {
      return word
    }
  }).join(' ')

  return str
}

// asserts postal code is XXXX, XXXXYYY or XXXX-YYY
function isValidPostalCode (str) {
  return str && /^\d{4}(\p{Dash}?\d{3})?$/u.test(str)
}

// the vectory layer for Carta de Perigosidade Incêndio Rural comes with coding numbers
function convertPerigoIncendio (gridcode) {
  switch (gridcode) {
    case 0:
      return 'nulo'
    case 1:
      return 'muito baixo'
    case 2:
      return 'baixo'
    case 3:
      return 'médio'
    case 4:
      return 'alto'
    case 5:
      return 'muito alto'
    default:
      return ''
  }
}
