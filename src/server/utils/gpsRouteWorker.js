/* worker that calculates for a certain geojson file, if coordinates are within those polygons */
const fs = require('fs')
const PolygonLookup = require('polygon-lookup')

module.exports = ({ geojsonFilePath, lat, lon }) => {
  const geojsonData = JSON.parse(fs.readFileSync(geojsonFilePath))
  // BGRI => Base Geográfica de Referenciação de Informação (INE, 2021)
  const lookupBGRI = new PolygonLookup(geojsonData)
  const subSecction = lookupBGRI.search(lon, lat)
  return subSecction
}
