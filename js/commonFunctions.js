/* functions common to many server modules and routines */

module.exports = { normalizeName }

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
