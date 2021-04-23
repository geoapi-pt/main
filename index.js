const path = require('path')
const shapefile = require('shapefile')

shapefile.open(path.join('res','concelhos.shp'))
  .then(source => source.read()
    .then(function log(result) {
      if (result.done) return;
      console.log(result.value);
      return source.read().then(log);
    }))
  .catch(error => console.error(error.stack))
