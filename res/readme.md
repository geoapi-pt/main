This directory has all the resource information. You should read this to later update these resources.

After updating any resource, run `npm test`.

## Carta Administrativa Oficial de Portugal

The ZIP files of the "Carta Administrativa Oficial de Portugal" were downloaded from the Direção Geral de Território website [here](https://www.dgterritorio.gov.pt/dados-abertos) into the directory `/res/portuguese-administrative-chart/`. These are 5 ZIP files, corresponding to Continental Portugal, Madeira and Western, Central and Eastern group of Azores.

In each download link several options appear, but the versions ending in `AAd_CAOP2020.zip` should be selected.
That is, we should not download the files with `troco` because they make reference to the lines (troço) and not to the surfaces.
We should not select either the ones ending in `GPKG`.

To update, we must only download the 5 ZIP files into `/res/portuguese-administrative-chart/` and the code should do the rest, if the structure of thoese files remains unchanged. We must also update the files names in the object `regions` in the file `/prepareServer.js`

## Details about Parishes and Municipalities

The JSON files in `/res/details-parishes-municipalities/` have the detailed information of the Municipalities and Parishes. The `A` files were downloaded from dados.gov.pt and the `B` files from Direção Geral das Autarquias Locais's (DGAL) website. The function `readJsonFiles` at [`prepareServer.js`](../prepareServer.js) merges data from these two different sources.

Many of the contacts reported by DGAL were not correct nor updated, therefore further corrections and updates were done manually to the `B` files by looking the websites of parishes and municipalities on the Internet.

| Administration | dados.gov.pt | DGAL |
| -------------- | ----------- | --------------|
| Municipalities | [detalhesMunicipiosA.json (02-05-2018)](https://dados.gov.pt/pt/datasets/municipios-dados-gerais/) | [detalhesMunicipiosB.json (08-05-2021)](http://www.portalautarquico.dgal.gov.pt/pt-PT/administracao-local/entidades-autarquicas/municipios/) |
| Parishes   | [detalhesFreguesiasA.json (02-05-2018)](https://dados.gov.pt/pt/datasets/freguesias-dados-gerais/)  | [detalhesFreguesiasB.json (24-05-2021)](http://www.portalautarquico.dgal.gov.pt/pt-PT/administracao-local/entidades-autarquicas/freguesias/) |

Further manual updates should be done to the `B` files.

## Postal Codes

To further update postal codes we must only download the ZIP file from the CTT website [here](https://www.ctt.pt/feapl_2/app/restricted/postalCodeSearch/postalCodeDownloadFiles.jspx) (we need to create an account, but it's free of charge) and put it into `/res/postal-codes/` directory, replacing the existing one. The code should do the rest, if the structure of the unzipped files remains the same.

That zip file is automatically unzipped in the directory `/res/postal-codes/` and it contains 3 CSV files with no headers, and still one file `leiame.txt`. The headers of the CSV files are present in `leiame.txt`. The code already processes automatically this information, if the structure of the files remains unchanged.
