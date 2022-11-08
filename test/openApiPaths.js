/* get all paths present in openapi.yaml file based on paths and provided example values */

const fs = require('fs')
const path = require('path')
const YAML = require('yaml')
const appRoot = require('app-root-path')

const openapiFilePath = path.join(appRoot.path, 'src', 'public', 'openapi.yaml')

module.exports = getOpenApiTestPaths

function getOpenApiTestPaths () {
  const openAPIObj = YAML.parse(fs.readFileSync(openapiFilePath, 'utf8'))

  let pathsToTest = []
  for (let path in openAPIObj.paths) {
    const urlPath = path
    if (openAPIObj.paths[path].$ref) { // path is alias, thus use $ref
      path = openAPIObj.paths[path].$ref.replace('#/paths/', '').replaceAll('~1', '/')
    }

    if (!/.*\{.*\}.*/.test(path)) { // path has no path parameters
      if (openAPIObj.paths[path].get.parameters) { // path has other parameters, for example query parameters
        const parameters = openAPIObj.paths[path].get.parameters
        const queryParametersObj = {}
        parameters.forEach(parameter => {
          if (parameter.in === 'query' && parameter.required) {
            queryParametersObj[parameter.name] = parameter.schema.example
          }
        })
        if (Object.keys(queryParametersObj).length) {
          pathsToTest.push(`${urlPath}?${new URLSearchParams(queryParametersObj)}`)
        } else {
          pathsToTest.push(urlPath)
        }
      } else { // no parameters at all
        pathsToTest.push(urlPath)
      }
    } else { // path has path parameters, ex: /gps/{coordenadas}
      const parameters = openAPIObj.paths[path].get.parameters
      let parsedPath = urlPath
      parameters.forEach(parameter => {
        if (parameter.in === 'path') {
          if (!parameter.examples) {
            parsedPath = parsedPath.replace(`{${parameter.name}}`, parameter.schema.example)
          } else {
            const examplesKeys = Object.keys(parameter.examples)
            const randomExampleIndex = Math.floor(Math.random() * examplesKeys.length)
            parsedPath = parsedPath.replace(`{${parameter.name}}`, parameter.examples[examplesKeys[randomExampleIndex]].value)
          }
        }
      })
      pathsToTest.push(parsedPath)
    }
  }

  // remove root element if exists
  pathsToTest = pathsToTest.filter(path => path !== '/')
  return pathsToTest
}
