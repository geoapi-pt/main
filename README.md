# geo-pt-api

Detect official divisional administrative regions of Portugal (last updated 2020), providing coordinates as input

```js
var res = getAdministrativeDivisionsPT(lat, long);
console.log(res) // {distrito: 'Leiria', concelho: 'Alcobaça', freguesia: 'Cós'}
```

## Convert geopackage into shapefile

The official geopackage file (from Direção Geral Território) is [here](http://mapas.dgterritorio.pt/ATOM-download/CAOP-Cont/Cont_AAD_CAOP2020-GPKG.zip).

To convert the geopackage into shapefile `.shp` and `.dbf` extensions, use this command from [ogr2ogr](https://gdal.org/programs/ogr2ogr.html). If you want to install OGR in Ubuntu see [here](https://mothergeo-py.readthedocs.io/en/latest/development/how-to/gdal-ubuntu-pkg.html).

```
ogr2ogr -f "ESRI Shapefile" output_folder input.gpkg
```
