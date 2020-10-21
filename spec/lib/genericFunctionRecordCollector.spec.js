const { Gopher, genericFunctionRecordCollector, buildSDKCollector } = require('../../index.js')

describe('genericFunctionRecordCollector', () => {
  const exampleDepRelPath = '../../spec/exampleDependency'
  const exampleDepImportedName = 'fake'
  const exampleDataSource = 'TEST'
  const dependencyMap = {
    [ exampleDepImportedName ] : exampleDepRelPath
  };

  it('can do async arg order', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        name: 'fake'
      },
      apiMethod: {
        name: 'asyncArgOrderDependency'
      },
      argumentOrder: ['foo', 'bar'],
      requiredParams: {
        foo: {},
        bar: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          foo: { value: 'foo' },
          bar: { value: 'bar' },
        }
      }
    }
    const gopher = Gopher(dependencies)
    gopher.recordCollectors[exampleDataSource] = buildSDKCollector({getApi: genericFunctionRecordCollector, dependencyMap})
    gopher.report((e, r) => {
      expect(e).toBeFalsy()
      expect(r.testDep[0]).toEqual('baz')
      done()
    })
  })

  it('can do async param', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        name: 'fake'
      },
      apiMethod: {
        name: 'asyncParamDependency'
      },
      requiredParams: {
        arg1: {},
        arg2: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          arg1: { value: 'foo' },
          arg2: { value: 'bar' },
        }
      }
    }
    const gopher = Gopher(dependencies)
    gopher.recordCollectors[exampleDataSource] = buildSDKCollector({getApi: genericFunctionRecordCollector, dependencyMap})
    gopher.report((e, r) => {
      expect(e).toBeFalsy()
      expect(r.testDep[0]).toEqual('baz')
      done()
    })
  })

  it('can do sync arg order', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        name: 'fake'
      },
      isSync: true,
      apiMethod: {
        name: 'syncArgOrderDependency'
      },
      argumentOrder: ['foo', 'bar'],
      requiredParams: {
        foo: {},
        bar: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          foo: { value: 'foo' },
          bar: { value: 'bar' },
        }
      }
    }
    const gopher = Gopher(dependencies)
    gopher.recordCollectors[exampleDataSource] = buildSDKCollector({getApi: genericFunctionRecordCollector, dependencyMap})
    gopher.report((e, r) => {
      expect(e).toBeFalsy()
      expect(r.testDep[0]).toEqual('baz')
      done()
    })
  })

  it('can do sync param', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      isSync: true,
      namespaceDetails: {
        name: 'fake'
      },
      apiMethod: {
        name: 'syncParamDependency'
      },
      requiredParams: {
        arg1: {},
        arg2: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          arg1: { value: 'foo' },
          arg2: { value: 'bar' },
        }
      }
    }
    const gopher = Gopher(dependencies)
    gopher.recordCollectors[exampleDataSource] = buildSDKCollector({getApi: genericFunctionRecordCollector, dependencyMap})
    gopher.report((e, r) => {
      expect(e).toBeFalsy()
      expect(r.testDep[0]).toEqual('baz')
      done()
    })
  })

  it('can do constructed sync param', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      isSync: true,
      namespaceDetails: {
        name: 'fake.constructableSyncParamDependency'
      },
      initializeNamespace: true,
      apiMethod: {
        name: 'returnedMethod'
      },
      requiredParams: {
        arg1: {},
        arg2: {},
        apiConfig: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          apiConfig: {value: {foo: 'bar'}},
          arg1: { value: 'foo' },
          arg2: { value: 'bar' },
        }
      }
    }
    const gopher = Gopher(dependencies)
    gopher.recordCollectors[exampleDataSource] = buildSDKCollector({getApi: genericFunctionRecordCollector, dependencyMap})
    gopher.report((e, r) => {
      expect(e).toBeFalsy()
      expect(r.testDep[0]).toEqual('baz')
      done()
    })
  })
})
