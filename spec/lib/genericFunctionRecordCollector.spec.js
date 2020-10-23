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
        isSync: true, // this validates that the nsdetails isSync doesn't trigger method sync
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

  it('can do param-driven async arg order', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        paramDriven: true
      },
      argumentOrder: ['foo', 'bar'],
      requiredParams: {
        apiConfig: {},
        foo: {},
        bar: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          apiConfig: {
            value: {
              apiObject: require('../exampleDependency').asyncArgOrderDependency 
            }
          },
          foo: { value: ['foo', 'foo'] },
          bar: { value: ['bar', 'bar'] },
        }
      }
    }
    const gopher = Gopher(dependencies)
    gopher.recordCollectors[exampleDataSource] = buildSDKCollector({getApi: genericFunctionRecordCollector, dependencyMap: {}})
    gopher.report((e, r) => {
      expect(e).toBeFalsy()
      expect(r.testDep).toEqual(['baz', 'baz'])
      done()
    })
  })

  it('can do param-driven async param parallel', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        paramDriven: true,
        parallel: true,
      },
      requiredParams: {
        apiConfig: {},
        arg1: {},
        arg2: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          apiConfig: {
            value: {
              apiObject: require('../exampleDependency').asyncParamDependency 
            },
          },
          arg1: { value: ['foo', 'foo'] },
          arg2: { value: ['bar', 'bar'] },
        }
      }
    }
    const gopher = Gopher(dependencies)
    gopher.recordCollectors[exampleDataSource] = buildSDKCollector({getApi: genericFunctionRecordCollector, dependencyMap: {}})
    gopher.report((e, r) => {
      expect(e).toBeFalsy()
      expect(r.testDep).toEqual(['baz', 'baz'])
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
      apiMethod: {
        isSync: true,
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
      namespaceDetails: {
        name: 'fake'
      },
      apiMethod: {
        isSync: true,
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

  it('can do param-driven sync param', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        isSync: true,
        paramDriven: true
      },
      requiredParams: {
        arg1: {},
        arg2: {},
        apiConfig: {},
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          apiConfig: {
            value: {
              apiObject: require('../exampleDependency').syncParamDependency 
            },
          },
          arg1: { value: 'foo' },
          arg2: { value: 'bar' },
        }
      }
    }
    const gopher = Gopher(dependencies)
    gopher.recordCollectors[exampleDataSource] = buildSDKCollector({getApi: genericFunctionRecordCollector, dependencyMap: {}})
    gopher.report((e, r) => {
      expect(e).toBeFalsy()
      expect(r.testDep[0]).toEqual('baz')
      done()
    })
  })

  it('can do param-driven sync param with argorder on the param', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        isSync: true,
        paramDriven:  true
      },
      requiredParams: {
        apiConfig: {},
        foo: {},
        bar: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          apiConfig: {
            value: {
              argumentOrder: ['foo', 'bar'],
              apiObject: require('../exampleDependency'),
              apiMethod: 'syncArgOrderDependency',
            }
          },
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

  it('can do param-driven sync param with argorder on the param', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        paramDriven:  true
      },
      apiMethod: {
        isSync: true,
        name:  'syncArgOrderDependency',
      },
      requiredParams: {
        apiConfig: {},
        foo: {},
        bar: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          apiConfig: {
            value: {
              argumentOrder: ['foo', 'bar'],
              apiObject: require('../exampleDependency'),
            }
          },
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

  it('can do param-driven sync param with syncstatus on apiconf', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        paramDriven: true
      },
      requiredParams: {
        arg1: {},
        arg2: {},
        apiConfig: {},
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          apiConfig: {
            value: {
              isSync: true,
              apiObject: require('../exampleDependency').syncParamDependency 
            },
          },
          arg1: { value: 'foo' },
          arg2: { value: 'bar' },
        }
      }
    }
    const gopher = Gopher(dependencies)
    gopher.recordCollectors[exampleDataSource] = buildSDKCollector({getApi: genericFunctionRecordCollector, dependencyMap: {}})
    gopher.report((e, r) => {
      console.log(e)
      expect(e).toBeFalsy()
      expect(r.testDep[0]).toEqual('baz')
      done()
    })
  })

  it('can do constructed sync param with multiple arge', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        name: 'fake.constructableSyncParamDependencyNamespaceTarget',
        initialize: true,
      },
      apiMethod: {
        isSync: true,
        name: 'returnedMethod'
      },
      requiredParams: {
        arg1: {},
        arg2: {},
        foo: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          foo: {value:  'bar'},
          arg1: { value: ['foo', 'foo'] },
          arg2: { value: ['bar', 'bar'] },
        }
      }
    }
    const gopher = Gopher(dependencies)
    gopher.recordCollectors[exampleDataSource] = buildSDKCollector({getApi: genericFunctionRecordCollector, dependencyMap})
    gopher.report((e, r) => {
      expect(e).toBeFalsy()
      expect(r.testDep).toEqual([1, 1])
      done()
    })
  })

  it('can do constructed sync param and return the api', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        isSync: true,
        name: 'fake.constructableSyncParamDependencyNamespaceTarget',
        initialize: true,
      },
      requiredParams: {
        foo: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          foo: {value:  'bar'},
        }
      }
    }
    const gopher = Gopher(dependencies)
    gopher.recordCollectors[exampleDataSource] = buildSDKCollector({getApi: genericFunctionRecordCollector, dependencyMap})
    gopher.report((e, r) => {
      expect(e).toBeFalsy()
      expect(r.testDep[0].apiObject.returnedMethod({arg1: 'foo', arg2: 'bar'})).toEqual(1)
      done()
    })
  })

  it('can do constructed sync param', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        name: 'fake.constructableSyncParamDependency',
        initialize: true,
      },
      apiMethod: {
        isSync: true,
        name: 'returnedMethod'
      },
      requiredParams: {
        arg1: {},
        arg2: {},
        foo: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          foo: {value:  'bar'},
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

  it('can do constructed sync param using new', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        name: 'fake.constructableNewSyncParamDependency',
        initialize: { useNew: true },
      },
      apiMethod: {
        isSync: true,
        name: 'returnedMethod'
      },
      requiredParams: {
        arg1: {},
        arg2: {},
        foo: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          foo: {value:  'bar'},
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

  it('can do constructed sync param using new with arg order and no args', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        name: 'fake.constructableNewArgOrderNoArgSyncParamDependency',
        initialize: { 
          useNew: true ,
          argumentOrder: []
        },
      },
      apiMethod: {
        isSync: true,
        name: 'returnedMethod'
      },
      requiredParams: {
        arg1: {},
        arg2: {},
        foo: {}
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          foo: {value:  'bar'},
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

  it('can do constructed sync param with arg order', (done) => {
    const accessSchema = {
      dataSource: exampleDataSource,
      namespaceDetails: {
        name: 'fake.constructableArgOrderSyncParamDependency',
        initialize: { 
          argumentOrder: ['foo', 'bar'],
        },
      },
      apiMethod: {
        isSync: true,
        name: 'returnedMethod'
      },
      requiredParams: {
        foo: {},
        bar: {},
        arg1: {},
        arg2: {},
      }
    };
    const dependencies = {
      testDep: {
        accessSchema,
        params: {
          foo: { value: 'bar' },
          bar: { value: 'baz' },
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
