/* handlebars helper functions */

const debug = require('debug')('geoapipt:helpers')

module.exports = { obj2html, obj2dataAttribute, getHostnameFromUrl }

function obj2html (data, typeOfLink) {
  let html = ''

  const tableStart = '<table class="table table-hover"><tbody>'
  const tableEnd = '</tbody></table>'

  const renderTextAsRow = function (text, colPos) {
    html += '<tr>'
    if (!colPos) {
      html += `<th scope="row" colspan="2">${text}</th>`
    } else if (colPos === 1) {
      html +=
        `<th class="w-50" scope="row">${text}</th>` +
        '<td class="w-50"></td>'
    } else if (colPos === 2) {
      html +=
        '<td class="w-50"></td>' +
        `<td class="w-50">${getLink(text, typeOfLink)}</td>`
    }
    html += '</tr>'
  }

  const renderObjAsRow = function (obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string' || typeof obj[key] === 'number') {
        html +=
          '<tr>' +
          `  <td class="w-50">${key}</td>` +
          `  <td class="w-50">${obj[key]}</td>` +
          '</tr>'
      } else if (isObj(obj[key])) {
        renderTextAsRow(key)
        renderObjAsRow(obj[key])
      } else if (Array.isArray(obj[key])) {
        renderTextAsRow(key, 1)
        obj[key].forEach(el => {
          if (isObj(el)) {
            renderObjAsRow(el)
          } else {
            renderTextAsRow(el, 2)
          }
        })
      }
    }
  }

  if (Array.isArray(data)) {
    // if all elements of array are text elements, renders one single table for all elements
    if (data.every(el => typeof el === 'string')) {
      html += tableStart
      for (let i = 0; i < data.length; i++) {
        renderTextAsRow(data[i])
      }
      html += tableEnd

    // array of objects
    } else {
      for (let i = 0; i < data.length; i++) {
        html += tableStart
        renderObjAsRow(data[i])
        html += tableEnd
      }
    }

  // data is a single object
  } else if (isObj(data)) {
    html += tableStart
    renderObjAsRow(data)
    html += tableEnd
  } else if (typeof data === 'string') {
    html += tableStart
    renderTextAsRow(data)
    html += tableEnd
  }

  debug('obj2html: ', html)
  return html
}

function getLink (text, typeOfLink) {
  switch (typeOfLink) {
    case 'municipality':
      return `<a href="/municipios/${encodeURIComponent(text)}">${text}</a>`
    case 'parish':
      return `<a href="/freguesias/${encodeURIComponent(text)}">${text}</a>`
    default:
      return text
  }
}

function obj2dataAttribute (obj) {
  const str = encodeURIComponent(JSON.stringify(obj || {}))
  debug('obj2dataAttribute:', str)
  return str
}

function isObj (data) {
  return typeof data === 'object' && !Array.isArray(data) && data !== null
}

function getHostnameFromUrl (url) {
  return (new URL(url)).hostname
}
