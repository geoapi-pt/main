/* Module that informs if the response is to be JSON or HTML
   returns true for JSON, false for HTML */

module.exports = (req) => {
  return req.accepts(['html', 'json']) === 'json' ||
    (req.get('accept') && req.get('accept').includes('application/json')) ||
    (req.hostname && req.hostname.startsWith('json.')) ||
    parseInt(req.query.json) || req.query.json === 'true'
}
