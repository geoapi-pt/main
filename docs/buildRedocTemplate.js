/* Buils API docs using redoc-cli and creating template for redoc-cli according to this project specs
   Run via: npm run build-docs
*/

const fs = require('fs')
const path = require('path')
const Handlebars = require('handlebars')
const appRoot = require('app-root-path')

const configsPath = path.join(appRoot.path, 'configs.json')

// Path of generated Template further used by redocly to generated API docs
const redocTemplatePath = path.join(__dirname, 'redocTemplate.temp.hbs')

const configs = JSON.parse(fs.readFileSync(configsPath))

const template = Handlebars.compile(fs.readFileSync(path.join(__dirname, 'template.hbs'), 'utf-8'))

const { getHostnameFromUrl } = require(path.join(appRoot.path, 'src', 'server', 'utils', 'hbsHelpers'))
Handlebars.registerHelper('getHostnameFromUrl', getHostnameFromUrl)

const partialsDir = path.join(appRoot.path, 'src', 'views', 'partials')
fs.readdirSync(partialsDir).forEach(filename => {
  if (filename.endsWith('.hbs')) {
    const name = path.parse(filename).name

    Handlebars.registerPartial(
      name,
      fs.readFileSync(path.join(partialsDir, filename), 'utf-8')
    )
  }
})

configs.pageTitle = configs.docsTitle
configs.siteDescription = configs.description

const redoclyTemplate = template(configs)

fs.writeFileSync(redocTemplatePath, redoclyTemplate)
console.log('Template generated OK at ' + path.relative(appRoot.path, redocTemplatePath))
