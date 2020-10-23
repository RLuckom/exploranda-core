function asyncArgOrderDependency(arg1, arg2, callback) {
  expect(arg1).toEqual('foo')
  expect(arg2).toEqual('bar')
  setTimeout(() => { callback(null, 'baz') }, 0)
}

function asyncParamDependency(params, callback) {
  expect(params.arg1).toEqual('foo')
  expect(params.arg2).toEqual('bar')
  setTimeout(() => { callback(null, 'baz') }, 0)
}

function syncArgOrderDependency(arg1, arg2) {
  expect(arg1).toEqual('foo')
  expect(arg2).toEqual('bar')
  return 'baz'
}

function syncParamDependency(params) {
  expect(params.arg1).toEqual('foo')
  expect(params.arg2).toEqual('bar')
  return 'baz'
}

function constructableSyncParamDependency(constructorArgs) {
  expect(constructorArgs.foo).toEqual('bar')
  return {
    returnedMethod: syncParamDependency
  }
}

function constructableSyncParamDependencyNamespaceTarget(constructorArgs) {
  console.log('called')
  expect(constructorArgs.foo).toEqual('bar')
  let calls = 0
  const returnedMethod = function syncParamDependency(params) {
      expect(params.arg1).toEqual('foo')
      expect(params.arg2).toEqual('bar')
      calls += 1
      return calls
    }
  return {
    returnedMethod
  }
}

function constructableArgOrderSyncParamDependency(foo, bar) {
  expect(foo).toEqual('bar')
  expect(bar).toEqual('baz')
  return {
    returnedMethod: syncParamDependency
  }
}

function constructableNewSyncParamDependency(constructorArgs) {
  expect(constructorArgs.foo).toEqual('bar')
  this.returnedMethod = syncParamDependency
}

function constructableNewArgOrderNoArgSyncParamDependency(...args) {
  expect(args.length).toEqual(0)
  this.returnedMethod = syncParamDependency
}

module.exports = {
  asyncArgOrderDependency,
  asyncParamDependency,
  syncArgOrderDependency,
  syncParamDependency,
  constructableSyncParamDependency,
  constructableNewSyncParamDependency,
  constructableNewArgOrderNoArgSyncParamDependency,
  constructableArgOrderSyncParamDependency,
  constructableSyncParamDependencyNamespaceTarget,
}
