## Routes and parameters

### Georeferencing
#### /gps

The `/gps` route has three parameters: `lat`, `lon` and `detalhes` (optional).

The GET requests `/gps/40.153687,-8.514602` and `/gps?lat=40.153687&lon=-8.514602` are equivalent and return

```json
{
   "freguesia":"Anobra",
   "concelho":"Condeixa-A-Nova",
   "distrito":"Coimbra"
}
```

You may also request details for the returned municipality and parish with<br>`/gps?lat=40.153687&lon=-8.514602&detalhes=1`, which outputs:

```json
{
   "freguesia":"Anobra",
   "concelho":"Condeixa-A-Nova",
   "distrito":"Coimbra",
   "detalhesFreguesia":{
      "codigo":"6946",
      "nome":"Anobra",
      "municipio": "CONDEIXA-A-NOVA",
      "nif":"501280049",
      "rua":"Beco da Junta",
      "localidade":"Anobra (CONDEIXA-A-NOVA)",
      "codigopostal":"3150-012",
      "descrpostal":"ANOBRA",
      "email":"jfanobra@gmail.com",
      "telefone":"239943911",
      "fax":"239943911",
      "sitio":"www.freguesiadeanobra.pt",
      "codigoine":"60401",
      "eleitores2011":"1023",
      "populacao2011":"1357",
      "areaha":"1638.29",
      "nomecompleto":"Anobra"
   },
   "detalhesMunicipio":{
      "codigo":"2630",
      "nome":"CONDEIXA-A-NOVA",
      "nif":"501275380",
      "rua":"Largo Artur Barreto",
      "localidade":"CONDEIXA-A-NOVA",
      "codigopostal":"3150-128",
      "descrpostal":"CONDEIXA-A-NOVA",
      "email":"geral@cm-condeixa.pt",
      "telefone":"239949120",
      "fax":"239942711",
      "sitio":"www.cm-condeixa.pt",
      "areaha":"138.67",
      "populacao":"17078",
      "eleitores":"12658",
      "codigoine":"604"
   }
}
```
### Administrative regions
#### /municipios

With no parameters, returns an array with municipalities names, alphabetically sorted.

Accept parameters `nome`, `codigo`, `nif`, `codigopostal`, `email`, `telefone`, `fax`, `sitio` and `codigoine`.

The requests `/municipios/Évora` and `/municipios?nome=Évora` are equivalent and will return:

```json
{
  "codigo":"2643",
  "nif":"504828576",
  "rua":"Praça do Sertório",
  "localidade":"EVORA",
  "codigopostal":"7004-506",
  "descrpostal":"EVORA",
  "email":"cmevora@mail.evora.net",
  "telefone":"266777000",
  "fax":"266702950",
  "sitio":"www.cm-evora.pt",
  "areaha":"1307.03",
  "populacao":"56596",
  "eleitores":"47923",
  "codigoine":"705",
  "nome":"ÉVORA"
}
```

#### /freguesias

With no parameters, returns a JSON array with parishes (freguesias) names, alphabetically sorted.

Accept parameter `nome`, which makes reference to fields `nome`, `nomecompleto` and `nomecompleto2`. Also accepts parameters `municipio`, `codigo`, `nif`, `codigopostal`, `email`, `telefone`, `fax`, `sitio` and `codigoine`.

The requests `/freguesias/serzedelo` and `/freguesias?nome=serzedelo` are equivalent and will return

```json
[
   {
      "codigo":"6235",
      "nif":"506863115",
      "rua":"Rua do Grupo Desportivo, N.º 23",
      "localidade":"Serzedelo (GUIMARÃES)",
      "codigopostal":"4765-533",
      "descrpostal":"SERZEDELO",
      "email":"junta.serzedelo@gmail.com",
      "telefone":"253532236",
      "fax":"253532236",
      "sitio":"",
      "codigoine":"30866",
      "eleitores2011":"3504",
      "populacao2011":"4073",
      "areaha":"514.44",
      "nomecompleto":"Serzedelo",
      "nome":"Serzedelo",
      "municipio":"GUIMARÃES",
      "nomecompleto2":"Serzedelo"
   },
   {
      "codigo":"6269",
      "nif":"507009460",
      "rua":"Rua da Igreja",
      "localidade":"Serzedelo (PÓVOA DE LANHOSO)",
      "codigopostal":"4830-698",
      "descrpostal":"SERZEDELO",
      "email":"info@jf-serzedelo.pt",
      "telefone":"253636601",
      "fax":"253636601",
      "sitio":"",
      "codigoine":"30924",
      "eleitores2011":"798",
      "populacao2011":"830",
      "areaha":"964.51",
      "nomecompleto":"Serzedelo",
      "nome":"Serzedelo",
      "municipio":"PÓVOA DE LANHOSO",
      "nomecompleto2":"Serzedelo"
   }
]
```

And the request `/freguesias?nome=serzedelo&municipio=guimarães` will return

```json
{
  "codigo":"6235",
  "nif":"506863115",
  "rua":"Rua do Grupo Desportivo, N.º 23",
  "localidade":"Serzedelo (GUIMARÃES)",
  "codigopostal":"4765-533",
  "descrpostal":"SERZEDELO",
  "email":"junta.serzedelo@gmail.com",
  "telefone":"253532236",
  "fax":"253532236",
  "sitio":"",
  "codigoine":"30866",
  "eleitores2011":"3504",
  "populacao2011":"4073",
  "areaha":"514.44",
  "nomecompleto":"Serzedelo",
  "nome":"Serzedelo",
  "municipio":"GUIMARÃES",
  "nomecompleto2":"Serzedelo"
}
```

#### /municipios/{nome}/freguesias

Returns the parishes for the respective municipality, for example `/municipios/porto/freguesias` returns

```json
{
   "nome":"Porto",
   "freguesias":[
      "Bonfim",
      "Campanhã",
      "Paranhos",
      "Ramalde",
      "União das freguesias de Aldoar, Foz do Douro e Nevogilde",
      "União das freguesias de Cedofeita, Santo Ildefonso, Sé, Miragaia, São Nicolau e Vitória",
      "União das freguesias de Lordelo do Ouro e Massarelos"
   ]
}
```

#### /municipios/freguesias

Returns an array of objects, each object corresponding to a municipality and an array of its parishes

```json
[
   {
      "nome":"Abrantes",
      "freguesias":[
         "Bemposta",
         "Carvalhal",
         "Fontes",
         "Martinchel",
         "Mouriscas",
         "Pego",
         "Rio de Moinhos",
         "Tramagal",
         "União das freguesias de Abrantes (São Vicente e São João) e Alferrarede",
         "União das freguesias de Aldeia do Mato e Souto",
         "União das freguesias de Alvega e Concavada",
         "União das freguesias de São Facundo e Vale das Mós",
         "União das freguesias de São Miguel do Rio Torto e Rossio ao Sul do Tejo"
      ]
   },
   {
      "nome":"Aguiar da Beira",
      "freguesias":[
         "Carapito",
         "Cortiçada",
         "Dornelas",
         "Eirado",
         "Forninhos",
         "Pena Verde",
         "Pinheiro",
         "União das freguesias de Aguiar da Beira e Coruche",
         "União das freguesias de Sequeiros e Gradiz",
         "União das freguesias de Souto de Aguiar da Beira e Valverde"
      ]
   },
   "etc"
 ]
```

#### /distritos

Returns an array of objects with the list of districts (distritos)

#### /distritos/municipios

Returns an array of objects with the list of districts (distritos), each district with the corresponding list of municipalities

### Postal Codes
#### /cp

The path `/cp` makes reference to Postal Codes (Código Postal in Portuguese). You may search with only the first 4 digits, i.e. `/cp/XXXX`; or with the complete 7 digits, i.e. `/cp/XXXXYYY` or `/cp/XXXX-YYY` (normal hyphen `-`).

For example you may request `/cp/1950-449`, `/cp/1950449` or `/cp/1950-449?json=1`
