module.exports = async (res, jsonObj, data, configs, shieldsioCounters) => {
  res.type('text/html')

  const jsonBeautyHtml = convertJsonObjToHtml(jsonObj)
  res.render('jsonBeauty', {
    layout: false,
    defaultOrigin: configs.defaultOrigin,
    mainTitle: configs.mainTitle,
    pageTitle: data.pageTitle ? `${data.pageTitle} - ${configs.mainTitle}` : configs.mainTitle,
    siteDescription: configs.description,
    jsonBeautyHtml: jsonBeautyHtml,
    requestsLastHour: await shieldsioCounters.getRequestsLastHour(),
    requestsLastDay: await shieldsioCounters.getRequestsLastDay()
  })
}

function convertJsonObjToHtml (jsonObj) {
  let jsonStr = JSON.stringify(jsonObj, undefined, 4)
  jsonStr = '<br>' + jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
    let cls = 'number'
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'key'
      } else {
        cls = 'string'
      }
    } else if (/true|false/.test(match)) {
      cls = 'boolean'
    } else if (/null/.test(match)) {
      cls = 'null'
    }
    return '<span class="' + cls + '">' + match + '</span>'
  })
}
