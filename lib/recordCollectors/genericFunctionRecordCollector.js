const _ = require('lodash')

/*
 * { 
 *   namespaceDetails: {
 *     name: 'natural',
 */

function getApi(dependencies, sourceSchema, paramSet) {
  const constructorArgs = _.merge({},
    _.get(paramSet, 'apiConfig'),
    _.get(sourceSchema, 'namespaceDetails.constructorArgs')
  );
  let namespace = _.get(dependencies, sourceSchema.namespaceDetails.name)
  if (sourceSchema.initializeNamespace) {
    argumentOrder = _.get(sourceSchema, 'initializeNamespace.argumentOrder')
    if (argumentOrder) {
      const args = _.map(argumentOrder, (a) => constructorArgs[a])
      if (_.get(sourceSchema, 'initializeNamespace.useNew')) {
        namespace = new namespace(...args)
      } else {
        namespace = namespace(...args)
      }
    } else {
      if (_.get(sourceSchema, 'initializeNamespace.useNew')) {
        namespace = new namespace(constructorArgs)
      } else {
        namespace = namespace(constructorArgs)
      }
    }
  }
  const method = _.bind(_.get(namespace, sourceSchema.apiMethod.name), namespace);
  return function(params, callback) {
    let callable = method
    if (sourceSchema.isSync) {
      callable = function(...allArgs) {
        const callback = allArgs.pop()
        let result
        try {
          result = method(...allArgs)
        } catch(e) {
          setTimeout(() => { callback(e) }, 0)
          return
        }
        setTimeout(() => { callback(null, result) }, 0)
        return
      }
    }
    if (sourceSchema.argumentOrder) {
      const args = _.map(sourceSchema.argumentOrder, (a) => params[a])
      args.push(callback)
      callable(...args)
      return
    } else {
      callable(params, callback)
      return
    }
  }
}


module.exports = {
  genericFunctionRecordCollector: getApi
}
