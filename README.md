# geo-pt-api

Detect official divisional administrative regions of Portugal (last updated 2020, from [here](http://mapas.dgterritorio.pt/ATOM-download/CAOP-Cont/Cont_AAD_CAOP2020.zip)), providing coordinates as input

```js
var res = getAdministrativeDivisionsPT(lat, long);
console.log(res) // {distrito: 'Leiria', concelho: 'Alcobaça', freguesia: 'Cós'}
```
