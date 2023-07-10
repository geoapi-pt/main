This directory `routines` contains backend routines, for example routines that process the raw resource files, for the server to have useful information to provide. These routines are supposed to be run only once in a while, for example when the raw source files are updated. After regenerating resource files, the test suite must be run with `npm test`.

## Commons (`commons/`)

Common modules or routines used by different routines

### OpenAddresses (`commons/fetchAddresses.js`)

This script:

 - optionally downloads the [ZIP file from OpenAddresses](https://github.com/openaddresses/openaddresses/blob/master/sources/pt/countrywide.json), or simply use the cached (previously downloaded) version
 - unzips the file,
 - exctracts all the addresses into a JS Array of Objects, and
 - expurgates wrong addresses, defined in `commons/ignoreAddresses.json`
 - delivers the result: the JS Array of Objects, each Object containing street, postal code, city and coordinates.

## Census (`censos/`)

Via the command `npm run generate-censos-data`, the Censos GeoPackage ZIP [files](https://mapas.ine.pt/download/index2011.phtml) from INE, which are already stored in `res/censos/source`, are unzipped; all Census data is then agglomerated per municipality and per parish in `res/censos/data`. 

Via the command `npm run generate-censos-sections-subsections`, the raw Censos GeoPackage data is converted to GeoJSON, each GeoJSON file corresponding to one municipality, and then stored in the `res/censos/geojson` directory.

This will provide to the server the function of a Census API, that is, for each parish or municipality, the respective Census information from different years (2011 and 2021).

## Postal Codes (`generatePostalCodes/`)

The command `npm run generate-postalcodes` uses the `OpenAddresses` common module to fetch the OpenAddresses file as an Array of Objects, each Object containing street, postal code, city and coordinates. This command also unzips and processes the ZIP [file](https://www.ctt.pt/feapl_2/app/restricted/postalCodeSearch/postalCodeDownloadFiles.jspx) from the CTT (Portuguese Postal Codes) website, to have an index of all possible postal codes with corresponding street names and postal descriptions. 

Then, for each said postal code, all the corresponding GPS coordinates are fetched from the OpenAddresses file and a center and polygon for each said postal code is calculated.

For more information run

```
npm run generate-postalcodes -- --help
```

This will provide to the server the function of a postal code API, that is, for each postal code provide respective streets, postal description, polygon and center of mass.

## Addresses of administrative regions (`admins-addresses/`)

The command `npm run generate-admins-addresses` uses the `OpenAddresses` common module to fetch the OpenAddresses file as an Array of Objects, each Object containing street, postal code, city and coordinates. 

Then, for each Object (combination of street, postal code, city and coordinates) it calculates from the coordinates the respective `distrito, municipio, freguesia, secção, subsecção`, this combination forming the so called BGRI2021 code. For each `BGRI2021 code` it adds all its corresponding addresses fetched from the OpenAddresses file. Then it stores this data as JSON files in `/res/admins-addresses/`, in the format `distrito_code/municipio_code/freguesia_code/secção_code/subsecção_code.json` for better indexing in the file system.

For more information run

```
npm run generate-admins-addresses -- --help
```

This will provide to the server the function of reverse geocoding, that is, from GPS coordinates provide the respective address.