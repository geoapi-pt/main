// see file censosChartsMaping.json
export function getData (obj, censos) {
  const data = Object.values(obj)
    .filter(el => typeof el === 'string' || Array.isArray(el))
    .map(el => {
      if (Array.isArray(el)) {
        for (const el_ of el) {
          const res = processExpression(el_, censos)
          if (res) return res
        }
        return 0
      } else {
        return processExpression(el, censos)
      }
    })

  return data
}

// expr_ may be for example "N_EDIFICIOS_3OU4_PISOS"
// or "N_EDIFICIOS_3OU4_PISOS + N_EDIFICIOS_5OU_MAIS_PISOS / 4"
function processExpression (expr_, censos) {
  const expr = expr_.trim()
  // expression is a single item, for example "N_EDIFICIOS_3OU4_PISOS"
  if (!/\+|\*|\//.test(expr)) {
    if (censos[expr]) {
      return censos[expr]
    } else {
      return 0
    }
  } else {
    // it has math symbols +, * or /
    // for ex.: "N_EDIFICIOS_3OU4_PISOS + N_EDIFICIOS_5OU_MAIS_PISOS / 4"
    let expr2 = expr
    try {
      expr
        .split(/\+|\*|\//)
        .map(el => el.trim())
        .filter(el => isNaN(el))
        .forEach(el => {
          if (censos[el]) {
            expr2 = expr2.replace(el, censos[el])
          } else {
            throw {} // eslint-disable-line 
          }
        })
    } catch {
      return null
    }
    return eval(expr2) // eslint-disable-line no-eval
  }
}
