This directory has all the resource information. You should read this to later update these resources.

## Carta Administrativa Oficial de Portugal

The "Carta Administrativa Oficial de Portugal" was downloaded from the Direção Geral de Território website [here](https://www.dgterritorio.gov.pt/dados-abertos).
This directory `res/carta-administrativa-portugal/` has five different zip files, corresponding to Continental Portugal, Madeira and Western, Central and Eastern group of Azores.

In each download link several options appear, but the versions ending in `AAd_CAOP2020.zip` should selected.
That is, we should not download the files with `troco` because they make reference to the lines (troço) and not to the surfaces.
We should not select either the ones ending in `GPKG`.

## Details about Parishes and Municipalities

The JSON files in `res/detalhes-concelhos-freguesias/` have the detailed information of the Municipalities and Parishes. The `A` files were downloaded from dados.gov.pt and the `B` files from Direção Geral das Autarquias Locais's (DGAL) website. The function `readJsonFiles` at [`prepareServer.js`](../prepareServer.js) merges data from these two different sources.

Many of the contacts reported by DGAL were not correct nor updated, therefore further corrections and updates were done manually to the `B` files by looking the websites of parishes and municipalities on the Internet.

| Administration | dados.gov.pt | DGAL |
| -------------- | ----------- | --------------|
| Municipalities | [detalhesMunicipiosA.json (02-05-2018)](https://dados.gov.pt/pt/datasets/municipios-dados-gerais/) | [detalhesMunicipiosB.json (08-05-2021)](http://www.portalautarquico.dgal.gov.pt/pt-PT/administracao-local/entidades-autarquicas/municipios/) |
| Parishes   | [detalhesFreguesiasA.json (02-05-2018)](https://dados.gov.pt/pt/datasets/freguesias-dados-gerais/)  | [detalhesFreguesiasB.json (24-05-2021)](http://www.portalautarquico.dgal.gov.pt/pt-PT/administracao-local/entidades-autarquicas/freguesias/) |

Further manual updates should be done to the `B` files.

## Postal Codes

The postal code zip file were downloaded from the CTT website [here](https://www.ctt.pt/feapl_2/app/restricted/postalCodeSearch/postalCodeDownloadFiles.jspx). We must create an account, but the download of this file is free of costs. That zip file is unzipped into the directory `/res/postal-codes` and it contains 3 CSV files with no headers, and one file `leiame.txt`. The headers of the CSV files are present in `leiame.txt`.