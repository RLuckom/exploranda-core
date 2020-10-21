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

module.exports = {
  asyncArgOrderDependency,
  asyncParamDependency,
  syncArgOrderDependency,
  syncParamDependency,
  constructableSyncParamDependency,
}
