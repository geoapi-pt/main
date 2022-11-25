This directory `routines` contains backend routines, for example routines that process the raw resource files, for the server to have useful information to provide. These routines are supposed to be run only once in a while, for example when the raw source files are updated.

## Commons

Common modules or routines used by different routines

### OpenAddresses

The script `routines/commons/fetchAddresses.js` 

 - optionally downloads the [ZIP file from OpenAddresses](https://github.com/openaddresses/openaddresses/blob/master/sources/pt/countrywide.json), or simply use the cached (previously downloaded) version
 - unzips the file,
 - exctracts all the addresses into a JS Array of Objects, and
 - expurgates wrong addresses, defined in `ignoreAddresses.json`
 - delivers the result: the JS Array of Objects, each Object containing street, postal code, city and coordinates

## Census (`censos/`)

Via the command `npm run censos-generate-data`, the Censos GeoPackage ZIP [files](https://mapas.ine.pt/download/index2011.phtml) from INE, which are already stored in `res/censos/source`, are unzipped and processed. All Census data is then agglomerated per municipality and per parish in `res/censos/data`. 

Via the command `npm run censos-gpkg2geojson`, the raw data is converted to GeoJSON, each GeoJSON file corresponding to one municipality, and stored in the `res/censos/geojson` directory.

## Postal Codes (`generatePostalCodes/`)

The command `npm run generate-postalcodes` optionally downloads the ZIP [file](https://github.com/openaddresses/openaddresses/blob/master/sources/pt/countrywide.json) from OpenAddresses with thousands of postal codes and corresponding GPS coordinates. Alternatively it uses the cached file version. This command also unzips and processes the ZIP [file](https://www.ctt.pt/feapl_2/app/restricted/postalCodeSearch/postalCodeDownloadFiles.jspx) from the CTT (Portuguese Postal Codes) website, to have an index of all possible postal codes with corresponding street names and postal descriptions. Then, for each said postal code, all the corresponding GPS coordinates are fetched from the OpenAddresses file and a center and polygon for each said postal code is calculated.

For more information run

```
npm run generate-postalcodes -- --help
```

