/* functions common to many server modules and routines */

module.exports = { normalizeName, correctCase }

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
      return word.toUpperCase() // "r fernando..." => "R...
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
