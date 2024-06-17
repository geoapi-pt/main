// see file censosChartsMaping.json
export function getData (obj, censos) {
  const data = Object.values(obj).map(el => {
    if (Array.isArray(el)) {
      for (const el_ of el) {
        if (!el_.includes('+')) {
          if (censos[el_]) return censos[el_]
        } else {
          return el_
            .split('+')
            .map(e => e.trim())
            .reduce((accumulator, a) => accumulator + (censos[a] || 0), 0)
        }
      }
      return 0
    } else {
      return censos[el]
    }
  })
  return data
}
