const _ = require('lodash')

function getApi(dependencies, sourceSchema, paramSet) {
  const constructorArgs = _.merge({},
    _.get(paramSet, 'apiConfig'),
    _.get(sourceSchema, 'namespaceDetails.constructorArgs')
  );
  let namespace = _.get(dependencies, sourceSchema.namespaceDetails.name)
  const initializeNamespace = _.get(sourceSchema, 'namespaceDetails.initialize')
  if (initializeNamespace) {
    argumentOrder = _.get(initializeNamespace, 'argumentOrder')
    if (argumentOrder) {
      const args = _.map(argumentOrder, (a) => constructorArgs[a])
      if (_.get(initializeNamespace, 'useNew')) {
        namespace = new namespace(...args)
      } else {
        namespace = namespace(...args)
      }
    } else {
      if (_.get(initializeNamespace, 'useNew')) {
        namespace = new namespace(constructorArgs)
      } else {
        namespace = namespace(constructorArgs)
      }
    }
  }
  if (!sourceSchema.apiMethod) {
    return function(params, callback) {
      callback(null, {apiObject: namespace})
    }
  }
  const method = _.bind(_.get(namespace, sourceSchema.apiMethod.name), namespace);
  return function(params, callback) {
    let targetedCallback = callback
    if (_.get(sourceSchema, 'namespaceDetails.isTarget')) {
      targetedCallback = function(e, r) {
        callback(e, method)
      }
    }
    let callable = method
    if (sourceSchema.isSync) {
      callable = function(...allArgs) {
        const callback = allArgs.pop()
        let result
        try {
          result = method(...allArgs)
        } catch(e) {
          setTimeout(() => { targetedCallback(e) }, 0)
          return
        }
        setTimeout(() => { 
          targetedCallback(null, result) 
        }, 0)
        return
      }
    }
    if (sourceSchema.argumentOrder) {
      const args = _.map(sourceSchema.argumentOrder, (a) => params[a])
      args.push(targetedCallback)
      callable(...args)
      return
    } else {
      callable(params, targetedCallback)
      return
    }
  }
}


module.exports = {
  genericFunctionRecordCollector: getApi
}
