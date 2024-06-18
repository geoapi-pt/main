// see file censosChartsMaping.json
export function getData (obj, censos) {
  const data = Object.values(obj)
    .filter(el => typeof el === 'string' || Array.isArray(el))
    .map(el => {
      if (Array.isArray(el)) {    
        for (const el_ of el) {
          const res = processExpression(el_, censos)
          if(res) return res
        }
        return 0
      } else {
        return processExpression(el, censos)
      }
    }
  )

  return data
}

function processExpression (expr_, censos) {
  const expr = expr_.trim()
  // expression does not have math symbols +, * or /
  if (!/\+|\*|\//.test(expr)) {
    if (censos[expr]) { 
      return censos[expr]
    } else {
      return 0
    }
  } else {
    // it has math symbols +, * or /
    let expr2 = expr
    expr
      .split(/\+|\*|\//)
      .map(el => el.trim())
      .forEach(el => {
        if(censos[el]) {
          expr2.replace(el, censos[el])
        } else {
          expr2.replace(el, 0)
        }
      })
    return eval(expr2)
  }
}
