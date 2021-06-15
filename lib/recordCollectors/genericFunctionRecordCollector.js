const _ = require('lodash')
const { createBoundApi, buildSDKCollector } = require('./baseRecordCollector')

function getApi(dependencies, sourceSchema, paramSet) {
  const nonApiConfigParams = _.cloneDeep(paramSet)
  delete nonApiConfigParams.apiConfig
  const constructorArgs = _.merge({},
    nonApiConfigParams,
    _.get(sourceSchema, 'namespaceDetails.constructorArgs')
  );
  let namespace = _.get(dependencies, sourceSchema.namespaceDetails.name)
  const initializeNamespace = _.get(sourceSchema, 'namespaceDetails.initialize')
  if (initializeNamespace) {
    namespace = createBoundApi(dependencies, sourceSchema.namespaceDetails.name)
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
  const method = createBoundApi(namespace, sourceSchema.apiMethod.name);
  return function(params, callback) {
    let targetedCallback = callback
    if (_.get(sourceSchema, 'namespaceDetails.isTarget')) {
      targetedCallback = function(e, r) {
        callback(e, method)
      }
    }
    let callable = method
    if (_.get(sourceSchema, 'apiMethod.isSync')) {
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
    const argOrder = _.get(sourceSchema, 'apiMethod.argumentOrder')
    if (argOrder) {
      const args = _.map(argOrder, (a) => params[a])
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
  genericFunctionRecordCollector: getApi,
  lookUpRecords: buildSDKCollector({getApi}),
}
