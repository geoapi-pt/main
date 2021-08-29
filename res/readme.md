This directory has all the resource information. You should read this to later update these resources.

## zip files

The "Carta Administrativa Oficial de Portugal" was downloaded from the Direção Geral de Território website [here](https://www.dgterritorio.gov.pt/dados-abertos).
This directory `res/` has five different zip files, corresponding to Continental Portugal, Madeira and Western, Central and Eastern group of Azores.

In each download link several options appear, but the versions ending in `AAd_CAOP2020.zip` should selected.
That is, we should not download the files with `troco` because they make reference to the lines (troço) and not the surfaces.
We should not select either the ones ending in `GPKG`.

## json files

The JSON files have the detailed information of the Municipalities and Parishes. The `A` files were downloaded from https://dados.gov.pt/pt and the `B` files from Direção Geral das Autarquias Locais's (DGAL) website. The code merges these two sources.

Many of the contacts reported by DGAL were not correct nor updated, therefore further corrections and updates were done manually to the `B` files by looking the websites of parishes and municipalities on the Internet.

| Administration | dados.gov.pt | DGAL |
| -------------- | ----------- | --------------|
| Municipalities | [extracted on 02-05-2018 (A file)](https://dados.gov.pt/pt/datasets/municipios-dados-gerais/) | [extracted on 08-05-2021 (B file)](http://www.portalautarquico.dgal.gov.pt/pt-PT/administracao-local/entidades-autarquicas/municipios/) |
| Parishes   | [extracted on 02-05-2018 (A file)](https://dados.gov.pt/pt/datasets/municipios-dados-gerais/)  | as |
