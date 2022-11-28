This directory has all the resource information. You should read this to later update these resources.

After updating any resource, run `npm test`.

## Carta Administrativa Oficial de Portugal

The ZIP files of the "Carta Administrativa Oficial de Portugal" were downloaded from the Direção Geral de Território website [here](https://www.dgterritorio.gov.pt/dados-abertos) into the directory `/res/portuguese-administrative-chart/`. These are 5 ZIP files, corresponding to Continental Portugal, Madeira and Western, Central and Eastern group of Azores.

In each download link several options appear, but the versions ending in `AAd_CAOP2020.zip` should be selected.
That is, we should not download the files with `troco` because they make reference to the lines (troço) and not to the surfaces.
We should not select either the ones ending in `GPKG`.

To update, we must only download the 5 ZIP files into `/res/portuguese-administrative-chart/` and the code should do the rest, if the structure of thoese files remains unchanged. We must also update the files names in the object `regions` in the file `getGeojsonRegions.js`

## Details about Parishes and Municipalities

The JSON files in `/res/details-parishes-municipalities/` have the detailed information of the Municipalities and Parishes. The `A` files were downloaded from dados.gov.pt and the `B` files from Direção Geral das Autarquias Locais's (DGAL) website. The function `readJsonFiles` at `getRegionsAndAdmins.js` merges data from these two different sources.

Many of the contacts reported by DGAL were not correct nor updated, therefore further corrections and updates were done manually to the `B` files by looking the websites of parishes and municipalities on the Internet.

| Administration | dados.gov.pt | DGAL |
| -------------- | ----------- | --------------|
| Municipalities | [detalhesMunicipiosA.json (02-05-2018)](https://dados.gov.pt/pt/datasets/municipios-dados-gerais/) | [detalhesMunicipiosB.json (08-05-2021)](http://www.portalautarquico.dgal.gov.pt/pt-PT/administracao-local/entidades-autarquicas/municipios/) |
| Parishes   | [detalhesFreguesiasA.json (02-05-2018)](https://dados.gov.pt/pt/datasets/freguesias-dados-gerais/)  | [detalhesFreguesiasB.json (24-05-2021)](http://www.portalautarquico.dgal.gov.pt/pt-PT/administracao-local/entidades-autarquicas/freguesias/) |

Further manual updates should be done to the `B` files.

## Postal Codes

To further update postal codes we must only download the ZIP file from the CTT website [here](https://www.ctt.pt/feapl_2/app/restricted/postalCodeSearch/postalCodeDownloadFiles.jspx) (we need to create an account, but it's free of charge) and put it into `/res/postal-codes/` directory, replacing the existing one. The code should do the rest, if the structure of the unzipped files remains the same.

That zip file is automatically unzipped in the directory `/res/postal-codes/` and it contains 3 CSV files with no headers, and still one file `leiame.txt`. The headers of the CSV files are present in `leiame.txt`. The code already processes automatically this information, if the structure of the files remains unchanged.

## Censos

The Censos zipped GeoPackage files were got from the INE website [here](https://mapas.ine.pt/download/index2011.phtml). To update them, download the latest files from the INE website and put them into the respective directories inside `res/censos/source/{year}` according to the respective year; and then run `npm run convert-censos-gpkg2geojson` to generate the zipped geojson files inside `res/censos/geojson/{year}`.

## Carta de Uso e Ocupação do Solo

The directory `carta-solo` has already GeoJSON files with information of ground use (based on "Carta de Uso e Ocupação do Solo" from Direção Geral do Território), these files being split by parishes (freguesias), each parish in a different GeoJSON file. This allows quick indexing on the route `/gps`, since this route, based on GPS coordinates as input, already quickly responds the corresponding parish as output.

For the generation of these GeoJSON files, one must:
 1. Install [QGIS](https://qgis.org/en/site/forusers/download.html) PC desktop and `ogr2ogr` CLI command
 2. Download "Carta de Uso e Ocupação do Solo" GeoPackage (GPKG.zip) file, and also "Carta Administrativa Oficial de Portugal, Continente" GeoPackage (GPKG.zip) file, both from [D. G. Território](https://www.dgterritorio.gov.pt/dados-abertos)
 3. Unzip both zip files
 4. Open QGIS and add both gpkg files as different layers: `Layer` -> `Add Layer` -> `Add Vector Layer`. Select `Source Type` as `File` and then add both gpkg files
 5. Intersect both layers: `Vector` -> `Geoprocessing tools` -> `Intersection`. Select all fields from "Carta de Uso e Ocupação do Solo" layer, and none from "Carta Administrativa Oficial de Portugal, Continente", due to space saving in disk. A new layer `Intersection` is created with the intersection of both layers
 6. Split the layer `Intersection` by parish: `Vector` -> `Data Management Tools` -> `Split Vector Layer`. For the `Unique ID field`, select `Dicofre` (the parish INE id). Save the gpkg files to a temp `Output directory`.
 7. Batch convert the GeoPackage files into GeoJSON files with `ogr2ogr` and Unix bash, doing also the change of Coordinate Reference System (CRS) from `EPSG:3763` (ETRS89 / Portugal TM06) to `EPSG:4326` (WGS 84 -- WGS84 - World Geodetic System 1984, used in GPS):
```
for file in *.gpkg; do echo "Converting $file"; ogr2ogr -s_srs EPSG:3763 -t_srs EPSG:4326 -f GeoJSON ${file%.*}.json $file; done;
rename 's/^Dicofre_//' *.json # remove Dicofre from the beginning of each file
```
  8. Copy these json files into `res/carta-solo/`
