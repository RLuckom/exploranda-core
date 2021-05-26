const _ = require('lodash');
const {kinesisStreams, kinesisStream, kinesisStreamMetrics} = require('../../../lib/dataSources/aws/kinesis');
const vaultSecrets = require('../../../lib/dataSources/vault/secrets');
const elasticsearch = require('../../../lib/dataSources/elasticsearch/elasticsearch');
const {executeBasicTestSuite, executeCachingTestSuite, keys} = require('../composer.spec');

function initialization(namespace, region) {
  return {
    namespace,
    arguments: [_.merge({}, keys, {region})]
  };
}

function apiConfig() {
  return {value: _.merge({}, keys, {region: 'us-east-1'})};
}

function callParameters(method, args) {
  return {method, arguments: args};
}

function successfulKinesisCall(method, args, response, noInit) {
  return {
    initialization: initialization('Kinesis', 'us-east-1'),
    callParameters: callParameters(method, args),
    error: null,
    response,
    noInit
  };
}

const kinesisStreamWithAnotherParam = {
  dataSource: 'AWS',
  name: 'kinesisStream',
  namespaceDetails: {
    name: 'Kinesis',
    constructorArgs: {}
  },
  value: {
    path: 'StreamDescription',
  },
  apiMethod: 'describeStream',
  params: {
  },
  requiredParams: {
    otherParam: {},
    StreamName: {
      defaultSource: kinesisStreams
    }
  },
  incompleteIndicator: 'StreamDescription.HasMoreShards',
  nextBatchParamConstructor: (params, stream) => {
    const lastShardIndex = stream.StreamDescription.Shards.length - 1;
    const lastShardId = stream.StreamDescription.Shards[lastShardIndex].shardId;
    return _.merge(params, {ExclusiveStartShardId: lastShardId});
  },
  mergeOperator: (stream1, stream2) => {
    stream2.StreamDescription.Shards = [].concat(
      stream1.StreamDescription.Shards,
      stream2.StreamDescription.Shards
    );
  }
};

const kinesisStreamWithANonRequiredParam = {
  dataSource: 'AWS',
  name: 'kinesisStream',
  namespaceDetails: {
    name: 'Kinesis',
    constructorArgs: {}
  },
  value: {
    path: 'StreamDescription',
  },
  apiMethod: 'describeStream',
  params: {
  },
  optionalParams: {
    otherParam: {
      formatter: (op) => `${op}.foo`
    }
  },
  requiredParams: {
    StreamName: {
      defaultSource: kinesisStreams
    }
  },
  incompleteIndicator: 'StreamDescription.HasMoreShards',
  nextBatchParamConstructor: (params, stream) => {
    const lastShardIndex = stream.StreamDescription.Shards.length - 1;
    const lastShardId = stream.StreamDescription.Shards[lastShardIndex].shardId;
    return _.merge(params, {ExclusiveStartShardId: lastShardId});
  },
  mergeOperator: (stream1, stream2) => {
    stream2.StreamDescription.Shards = [].concat(
      stream1.StreamDescription.Shards,
      stream2.StreamDescription.Shards
    );
  }
};

function kinesisNamesDependency(cacheLifetime) {
  return {
    accessSchema: kinesisStreams,
    behaviors: {cacheLifetime},
    params: {
      apiConfig: apiConfig(),
    }
  };
}

function kinesisNamesMock() {
  return {
    source: 'AWS',
    sourceConfig: successfulKinesisCall('listStreams', [{Limit: 100}], {StreamNames: ['foo', 'bar', 'baz']}),
    expectedValue: ['foo', 'bar', 'baz']
  };
}

const twoAWSAndOneSyntheticTestCase = {
  name: 'two AWS and one synthetic test case',
  dataDependencies: {
    kinesisStream: {
      accessSchema: kinesisStream,
      params: {
        StreamName: {
          source: 'synthetic',
          formatter: ({synthetic}) => synthetic[0].StreamNames[0]
        },
        StreamName1: {
          source: 'synthetic',
          formatter: ({synthetic}) => synthetic[0].StreamNames[0]
        },
        apiConfig: apiConfig(),
      }
    },
    kinesisStream1: {
      accessSchema: kinesisStream,
      params: {
        StreamName: {
          source: 'synthetic',
          formatter: ({synthetic}) => synthetic[0].StreamNames[0]
        },
        StreamName1: {
          source: 'synthetic',
          formatter: ({synthetic}) => synthetic[0].StreamNames[0]
        },
        apiConfig: apiConfig(),
      }
    },
    synthetic: {
      accessSchema: {
        dataSource: 'SYNTHETIC',
        transformation: () => {
          return [{StreamNames: ['qux']}];
        },
        requiredParams: {
        },
      },
    }
  },
  namedMocks: {
    kinesisStream: {
      source: 'AWS',
      sourceConfig: successfulKinesisCall('describeStream', [{StreamName: 'qux', StreamName1: 'qux'}], {StreamDescription: {StreamName: 'quxStream'}}),
      expectedValue: [{StreamName: 'quxStream'}]
    },
    kinesisStream1: {
      source: 'AWS',
      sourceConfig: successfulKinesisCall('describeStream', [{StreamName: 'qux', StreamName1: 'qux'}], {StreamDescription: {StreamName: 'quxStream'}}),
      expectedValue: [{StreamName: 'quxStream'}]
    },
    synthetic: {
      source: 'SYNTHETIC',
      expectedValue: [{StreamNames: ['qux']}]
    }
  },
};

const basicAwsTestCase = {
  name: 'Basic Single-AWS-request case',
  dataDependencies: {
    // add a cacheLifetime. This test does not rely on caching.
    // It only makes one request. Adding a cacheLifetime should
    // mean that the result gets cached, which should not interfere
    // with the success of this test case.
    kinesisNames: kinesisNamesDependency(1000)
  },
  namedMocks: {
    kinesisNames: kinesisNamesMock(),
  },
};

const basicAwsCachingTestCase = {
  name: 'Single-source caching request case',
  dataDependencies: {
    kinesisNames: kinesisNamesDependency(1000)
  },
  phases: [
  {
    time: 0,
    preCache: {},
    mocks: {
      kinesisNames: {
        source: 'AWS',
        sourceConfig: successfulKinesisCall('listStreams', [{Limit: 100}], {StreamNames: ['foo', 'bar', 'baz']})
      }
    },
    expectedError: null,
    expectedValues: {
      kinesisNames: ['foo', 'bar', 'baz']
    },
    postCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'baz']}]
    },
  },
  {
    time: 500,
    mocks: {},
    preCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'baz']}]
    },
    postCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'baz']}]
    },
    expectedError: null,
    expectedValues: {
      kinesisNames: ['foo', 'bar', 'baz']
    }
  }]
};

const awsExpiringCacheTestCase = {
  name: 'Single-source get, get-from-cache, get',
  dataDependencies: {
    kinesisNames: kinesisNamesDependency(1000)
  },
  phases: [
  {
    time: 0,
    preCache: {},
    mocks: {
      kinesisNames: {
        source: 'AWS',
        sourceConfig: successfulKinesisCall('listStreams', [{Limit: 100}], {StreamNames: ['foo', 'bar', 'baz']})
      }
    },
    expectedError: null,
    expectedValues: {
      kinesisNames: ['foo', 'bar', 'baz']
    },
    postCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'baz']}]
    },
  },
  {
    time: 500,
    mocks: {},
    preCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'baz']}]
    },
    postCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'baz']}]
    },
    expectedError: null,
    expectedValues: {
      kinesisNames: ['foo', 'bar', 'baz']
    }
  },
  {
    time: 1500,
    preCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'baz']}]
    },
    mocks: {
      kinesisNames: {
        source: 'AWS',
        sourceConfig: successfulKinesisCall('listStreams', [{Limit: 100}], {StreamNames: ['foo', 'bar', 'quux']})
      }
    },
    expectedError: null,
    expectedValues: {
      kinesisNames: ['foo', 'bar', 'quux']
    },
    postCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'quux']}]
    },
  }
  ]
};

const awsCachedDependencyRequirementTestCase = {
  name: 'dependency found in cache',
  dataDependencies: {
    kinesisNames: kinesisNamesDependency(1000),
    kinesisNames1: kinesisNamesDependency(1000),
    kinesisStreams: {
      accessSchema: kinesisStream,
      behaviors: {cacheLifetime: 1000},
      params: {
        StreamName: {
          source: ['kinesisNames', 'kinesisNames1'],
          formatter: ({kinesisNames, kinesisNames1}) => kinesisNames1
        },
        falsyParam: {value: 0},
        falsyParam2: {value: false},
        falsyParam3: {value: null},
        falsyParam4: {value: ''},
        apiConfig: apiConfig(),
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'kinesisNames',
    preCache: {},
    mocks: {
      kinesisNames: {
        source: 'AWS',
        sourceConfig: successfulKinesisCall('listStreams', [{Limit: 100}], {StreamNames: ['foo']})
      }
    },
    expectedError: null,
    expectedValues: {
      kinesisNames: ['foo']
    },
    postCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo']}]
    },
  },
  {
    time: 300,
    target: 'kinesisNames1',
    preCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo']}]
    },
    mocks: {
      kinesisNames: {
        source: 'AWS',
        sourceConfig: successfulKinesisCall('listStreams', [{Limit: 100}], {StreamNames: ['foo', 'bar']})
      }
    },
    expectedError: null,
    expectedValues: {
      kinesisNames1: ['foo', 'bar']
    },
    postCache: {
      kinesisNames1: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar']}],
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo']}]
    },
  },
  {
    time: 500,
    mocks: {},
    target: ['kinesisNames'],
    preCache: {
      kinesisNames1: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar']}],
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo']}]
    },
    postCache: {
      kinesisNames1: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar']}],
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo']}]
    },
    expectedError: null,
    expectedValues: {
      kinesisNames: ['foo'],
    }
  },
  {
    time: 700,
    mocks: {
      kinesisStreams: {
        source: 'AWS',
        sourceConfig: [
          successfulKinesisCall('describeStream', [{StreamName: 'foo', falsyParam: 0, falsyParam2: false, falsyParam3: null, falsyParam4: ''}], {StreamDescription: {StreamName: 'fooStream'}}),
          successfulKinesisCall('describeStream', [{StreamName: 'bar', falsyParam: 0, falsyParam2: false, falsyParam3: null, falsyParam4: ''}], {StreamDescription: {StreamName: 'barStream'}}),
        ]
      }
    },
    target: ['kinesisStreams'],
    preCache: {
      kinesisNames1: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar']}],
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo']}]
    },
    postCache: {
      kinesisNames1: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar']}],
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo']}],
      kinesisStreams: [
      {collectorArgs: {apiConfig: apiConfig().value, StreamName: ['foo', 'bar'], falsyParam: 0, falsyParam2: false, falsyParam3: null, falsyParam4: ''}, r: [{StreamName: 'fooStream'}, {StreamName: 'barStream'}]},
      ],
    },
    expectedError: null,
    expectedValues: {
      kinesisNames: ['foo'],
      kinesisNames1: ['foo', 'bar'],
      kinesisStreams: [
      {StreamName: 'fooStream'},
      {StreamName: 'barStream'},
      ],
    }
  },
  {
    time: 900,
    mocks: {},
    target: 'kinesisStreams',
    preCache: {
      kinesisNames1: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar']}],
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo']}],
      kinesisStreams: [
      {collectorArgs: {apiConfig: apiConfig().value, StreamName: ['foo', 'bar'], falsyParam: 0, falsyParam2: false, falsyParam3: null, falsyParam4: ''}, r: [{StreamName: 'fooStream'}, {StreamName: 'barStream'}]},
      ],
    },
    postCache: {
      kinesisNames1: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar']}],
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo']}],
      kinesisStreams: [
      {collectorArgs: {apiConfig: apiConfig().value, StreamName: ['foo', 'bar'], falsyParam: 0, falsyParam2: false, falsyParam3: null, falsyParam4: ''}, r: [{StreamName: 'fooStream'}, {StreamName: 'barStream'}]},
      ],
    },
    expectedError: null,
    expectedValues: {
      kinesisNames: ['foo'],
      kinesisNames1: ['foo', 'bar'],
      kinesisStreams: [
      {StreamName: 'fooStream'},
      {StreamName: 'barStream'},
      ],
    }
  },
  ]
};

const vaultTreeTestCase = {
  name: 'Vault tree of requests test case',
  dataDependencies: {
    vaultKeys: {
      accessSchema: vaultSecrets.tree,
      params: {
        'X-Vault-Token' : {value: 'secretVaultToken'},
        apiConfig: {
          value: {
            path: 'secrets/foo/',
            host: 'www.example.com'
          }
        }
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'vaultKeys',
    preCache: {},
    mocks: {
      vaultKeys: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://www.example.com/secrets/foo/',
            method: 'GET',
            qs: {list: true},
            headers: {
              'X-Vault-Token': 'secretVaultToken'
            },
            body: void(0),
            json: true,
            multipart: false,
          },
          error: null,
          response: {statusCode: 200},
          body: {data: {keys: ['bar/', 'baz/']}},
        }, {
          callParameters: {
            url: 'https://www.example.com/secrets/foo/bar/',
            method: 'GET',
            qs: {list: true},
            headers: {
              'X-Vault-Token': 'secretVaultToken'
            },
            body: void(0),
            json: true,
            multipart: false,
          },
          error: null,
          response: {statusCode: 200},
          body: {data: {keys: ['qux', 'qux/']}},
        }, {
          callParameters: {
            url: 'https://www.example.com/secrets/foo/baz/',
            method: 'GET',
            qs: {list: true},
            headers: {
              'X-Vault-Token': 'secretVaultToken'
            },
            body: void(0),
            json: true,
            multipart: false,
          },
          error: null,
          response: {statusCode: 200},
          body: {data: {keys: []}},
        }, {
          callParameters: {
            url: 'https://www.example.com/secrets/foo/bar/qux/',
            method: 'GET',
            qs: {list: true},
            headers: {
              'X-Vault-Token': 'secretVaultToken'
            },
            body: void(0),
            json: true,
            multipart: false,
          },
          error: null,
          response: {statusCode: 200},
          body: {data: {keys: ['bax']}},
        }],
      }
    },
    expectedError: null,
    expectedValues: {
      vaultKeys: [{
        'bar/': {
          qux: {__isSecret: true},
          'qux/': {
            bax: {
              __isSecret: true
            },
          }
        },
        'baz/': {}
      }],
    },
    postCache: {},
  },
  ]
};

const slackInputTestCase = {
  name: 'slack form input requests test case',
  dataDependencies: {
    slack: {
      accessSchema: {
        dataSource: 'GENERIC_API',
        host: 'slack.com',
        path: '/api/conversations.list',
        formParamKeys: ['token'],
        bodyParamKeys: [],
        multipart: true,
      },
      params: {
        token : {value: 'secrettoken'},
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'slack',
    preCache: {},
    preInputs: {},
    phaseInputs: {},
    postInputs: {},
    mocks: {
      slack: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://slack.com/api/conversations.list',
            headers: {},
            qs: {},
            body: void(0),
            json: true,
            multipart: true,
            method: 'GET',
          },
          error: null,
          response: {statusCode: 200},
          body: {channels: [1, 2]},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      slack: [{
        body: {channels: [1, 2]},
        statusCode: 200,
        headers: void(0)
      }],
    },
    postCache: {},
  },
  ]
};

const slackInputFormattingTestCase = {
  name: 'slack formmatin8g input requests test case',
  dataDependencies: {
    slack: {
      accessSchema: {
        dataSource: 'GENERIC_API',
        host: 'slack.com',
        path: '/api/conversations.list',
        formParamKeys: ['token'],
        bodyParamKeys: [],
        multipart: true,
      },
      formatter: (r, inputs) => {
        console.log(inputs)
        return inputs.foo
      },
      params: {
        token : {value: 'secrettoken'},
      }
    },
  },
  inputs: {
    foo: 'bar',
  },
  phases: [
  {
    time: 0,
    target: 'slack',
    preCache: {},
    preInputs: {
      foo: 'bar',
    },
    phaseInputs: {},
    postInputs: {
      foo: 'bar',
    },
    mocks: {
      slack: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://slack.com/api/conversations.list',
            headers: {},
            qs: {},
            body: void(0),
            json: true,
            multipart: true,
            method: 'GET',
          },
          error: null,
          response: {statusCode: 200},
          body: {channels: [1, 2]},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      slack: 'bar',
    },
    postCache: {},
  },
  ]
};

const slackInputUrlParamTestCase = {
  name: 'slack form input requests test case',
  dataDependencies: {
    slack: {
      accessSchema: {
        dataSource: 'GENERIC_API',
        url: 'https://slack.com/api/conversations.list?foo=bar',
        formParamKeys: ['token'],
        queryParamKeys: ['baz'],
        bodyParamKeys: [],
        multipart: true,
      },
      params: {
        token : {value: 'secrettoken'},
        baz : {value: 'qux'},
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'slack',
    preCache: {},
    preInputs: {},
    phaseInputs: {},
    postInputs: {},
    mocks: {
      slack: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://slack.com/api/conversations.list?baz=qux&foo=bar',
            headers: {},
            body: void(0),
            json: true,
            multipart: true,
            method: 'GET',
          },
          error: null,
          response: {statusCode: 200},
          body: {channels: [1, 2]},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      slack: [{
        body: {channels: [1, 2]},
        statusCode: 200,
        headers: void(0)
      }],
    },
    postCache: {},
  },
  ]
};

const slackInputUrlApiConfigParamTestCase = {
  name: 'slack api config form input requests test case',
  dataDependencies: {
    slack: {
      accessSchema: {
        dataSource: 'GENERIC_API',
        formParamKeys: ['token'],
        queryParamKeys: ['baz'],
        bodyParamKeys: [],
        multipart: true,
      },
      params: {
        apiConfig: { value: [{
        url: 'https://slack.com/api/conversations.list?foo=bar',
        }]},
        token : {value: 'secrettoken'},
        baz : {value: 'qux'},
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'slack',
    preCache: {},
    preInputs: {},
    phaseInputs: {},
    postInputs: {},
    mocks: {
      slack: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://slack.com/api/conversations.list?baz=qux&foo=bar',
            headers: {},
            body: void(0),
            json: true,
            multipart: true,
            method: 'GET',
          },
          error: null,
          response: {statusCode: 200},
          body: {channels: [1, 2]},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      slack: [{
        body: {channels: [1, 2]},
        statusCode: 200,
        headers: void(0)
      }],
    },
    postCache: {},
  },
  ]
};

const slackInputErrorHandlerInAccessSchemaTestCase = {
  name: 'slack form input requests test case',
  dataDependencies: {
    slack: {
      accessSchema: {
        onError: () => {
          return {
            res: {
              body: {
                text: 'nvm it\'s fine'
              },
              statusCode: 200,
              headers: void(0)
            }
          }
        },
        dataSource: 'GENERIC_API',
        host: 'slack.com',
        path: '/api/conversations.list',
        formParamKeys: ['token'],
        bodyParamKeys: [],
        multipart: true,
      },
      params: {
        token : {value: 'secrettoken'},
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'slack',
    preCache: {},
    preInputs: {},
    phaseInputs: {},
    postInputs: {},
    mocks: {
      slack: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://slack.com/api/conversations.list',
            headers: {},
            qs: {},
            body: void(0),
            json: true,
            multipart: true,
            method: 'GET',
          },
          error: { text: 'you forgot The Thing' },
          response: {statusCode: 404},
          body: {channels: [1, 2]},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      slack: [{
        body: {
          text: 'nvm it\'s fine'
        },
        statusCode: 200,
        headers: void(0)
      }],
    },
    postCache: {},
  },
  ]
};

const slackInputErrorHandlerInDependencySchemaTestCase = {
  name: 'slack form input requests test case',
  dataDependencies: {
    slack: {
      accessSchema: {
        dataSource: 'GENERIC_API',
        host: 'slack.com',
        path: '/api/conversations.list',
        formParamKeys: ['token'],
        bodyParamKeys: [],
        multipart: true,
      },
      behaviors: {
        onError: () => {
          return {
            res: {
              body: {
                text: 'nvm it\'s fine'
              },
              statusCode: 200,
              headers: void(0)
            }
          }
        },
      },
      params: {
        token : {value: 'secrettoken'},
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'slack',
    preCache: {},
    preInputs: {},
    phaseInputs: {},
    postInputs: {},
    mocks: {
      slack: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://slack.com/api/conversations.list',
            headers: {},
            qs: {},
            body: void(0),
            json: true,
            multipart: true,
            method: 'GET',
          },
          error: { text: 'you forgot The Thing' },
          response: {statusCode: 404},
          body: {channels: [1, 2]},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      slack: [{
        body: {
          text: 'nvm it\'s fine'
        },
        statusCode: 200,
        headers: void(0)
      }],
    },
    postCache: {},
  },
  ]
};

const elasticsearchInputNoDefaultTestCase = {
  name: 'Elasticsearch input requests test case',
  dataDependencies: {
    elasticsearch: {
      accessSchema: elasticsearch.search,
      params: {
        'apikey' : {value: 'secretApiKey'},
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: {
          input: 'esSearchQuery',
          formatter: ({esSearchQuery}) => {
            return {queryString: esSearchQuery};
          },
        },
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'elasticsearch',
    preCache: {},
    preInputs: {},
    phaseInputs: {
      esSearchQuery: 'input1'
    },
    postInputs: {
      esSearchQuery: 'input1'
    },
    mocks: {
      elasticsearch: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://www.example.com/_search',
            headers: {},
            qs: {apikey: 'secretApiKey'},
            body: {
              query: {queryString: 'input1'},
            },
            json: true,
            multipart: false,
            method: 'POST',
          },
          error: null,
          response: {statusCode: 200},
          body: {hits: {hits: ['bar', 'baz']}},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      elasticsearch: [{
        hits: {
          hits: ['bar', 'baz'],
        },
      }],
    },
    postCache: {},
  },
  ]
};

const elasticsearchInputMissingTargetedTestCase = {
  name: 'Elasticsearch targeted request missing an input for a different dep',
  dataDependencies: {
    elasticsearch: {
      accessSchema: elasticsearch.search,
      params: {
        'apikey' : {value: 'secretApiKey'},
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: {
          input: 'esSearchQuery',
          formatter: ({esSearchQuery}) => {
            return {queryString: esSearchQuery};
          },
        },
      }
    },
    elasticsearch2: {
      accessSchema: elasticsearch.search,
      params: {
        'apikey' : {value: 'secretApiKey'},
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: {
          input: 'esSearchQuery2',
          formatter: ({esSearchQuery2}) => {
            throw new Error('incorrect formatter call')
          },
        },
        query2: {
          input: 'esSearchQuery2',
          formatter: ({esSearchQuery2}) => {
            throw new Error('incorrect formatter call')
          },
        },
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'elasticsearch',
    preCache: {},
    preInputs: {},
    phaseInputs: {
      esSearchQuery: 'input1'
    },
    postInputs: {
      esSearchQuery: 'input1'
    },
    mocks: {
      elasticsearch: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://www.example.com/_search',
            headers: {},
            qs: {apikey: 'secretApiKey'},
            body: {
              query: {queryString: 'input1'},
            },
            json: true,
            multipart: false,
            method: 'POST',
          },
          error: null,
          response: {statusCode: 200},
          body: {hits: {hits: ['bar', 'baz']}},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      elasticsearch: [{
        hits: {
          hits: ['bar', 'baz'],
        },
      }],
    },
    postCache: {},
  },
  ]
};

const elasticsearchInputMissingTestCase = {
  name: 'Elasticsearch request missing an input',
  dataDependencies: {
    elasticsearch: {
      accessSchema: elasticsearch.search,
      params: {
        'apikey' : {value: 'secretApiKey'},
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: {
          input: 'esSearchQuery',
          formatter: ({esSearchQuery}) => {
            return {queryString: esSearchQuery};
          },
        },
      }
    },
    elasticsearch2: {
      accessSchema: elasticsearch.search,
      params: {
        'apikey' : {value: 'secretApiKey'},
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: {
          input: 'esSearchQuery2',
          formatter: ({esSearchQuery2}) => {
            throw new Error('incorrect formatter call')
          },
        },
        query2: {
          input: 'esSearchQuery2',
          formatter: ({esSearchQuery2}) => {
            throw new Error('incorrect formatter call')
          },
        },
      }
    },
  },
  phases: [
  {
    time: 0,
    target: null,
    preCache: {},
    preInputs: {},
    phaseInputs: {
      esSearchQuery: 'input1'
    },
    postInputs: {
      esSearchQuery: 'input1'
    },
    mocks: {
    },
    expectedError: new Error('elasticsearch2 has an invalid input: esSearchQuery2 not in {"esSearchQuery":"input1"}'),
    postCache: {},
  },
  ]
};

const elasticsearchInputPlusDependencyTestCase = {
  name: 'Elasticsearch input requests test case3',
  dataDependencies: {
    elasticsearch: {
      accessSchema: elasticsearch.search,
      params: {
        'apikey' : {value: 'secretApiKey'},
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: {
          input: 'esSearchQuery',
          formatter: ({esSearchQuery}) => {
            return {queryString: esSearchQuery};
          },
        },
        bogusParam: {
          source: 'dependent',
          formatter: _.identity
        }
      }
    },
    dependent: {
      accessSchema: elasticsearch.search,
      params: {
        'apikey' : {value: 'secretApiKey'},
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: {value: {
          queryString: 'query'
        }},
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'elasticsearch',
    preCache: {},
    preInputs: {},
    phaseInputs: {
      esSearchQuery: 'input1'
    },
    postInputs: {
      esSearchQuery: 'input1'
    },
    mocks: {
      elasticsearch: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://www.example.com/_search',
            headers: {},
            qs: {apikey: 'secretApiKey'},
            body: {
              query: {queryString: 'input1'},
            },
            json: true,
            multipart: false,
            method: 'POST',
          },
          error: null,
          response: {statusCode: 200},
          body: {hits: {hits: ['bar', 'baz']}},
        }], 
      },
      dependent: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://www.example.com/_search',
            headers: {},
            qs: {apikey: 'secretApiKey'},
            body: {
              query: {queryString: 'query'},
            },
            json: true,
            multipart: false,
            method: 'POST',
          },
          error: null,
          response: {statusCode: 200},
          body: {hits: {hits: ['bar', 'baz']}},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      dependent: [{
        hits: {
          hits: ['bar', 'baz'],
        },
      }],
      elasticsearch: [{
        hits: {
          hits: ['bar', 'baz'],
        },
      }],
    },
    postCache: {},
  },
  ]
};

const elasticsearchInputOptionalDefaultTestCase = {
  name: 'Elasticsearch input requests test case1',
  dataDependencies: {
    elasticsearch: {
      accessSchema: elasticsearch.search,
      params: {
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: { value: {queryString: 'input1'}},
        apikey: {
          input: 'apikey',
          formatter: ({apikey}) => {
            return apikey;
          },
        },
      }
    },
  },
  inputs: {
    apikey: 'secretApiKey',
  },
  phases: [
  {
    time: 0,
    target: 'elasticsearch',
    preCache: {},
    preInputs: {
      apikey: 'secretApiKey',
    },
    phaseInputs: {
    },
    postInputs: {
      apikey: 'secretApiKey',
    },
    mocks: {
      elasticsearch: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://www.example.com/_search',
            headers: {},
            qs: {apikey: 'secretApiKey'},
            body: {
              query: {queryString: 'input1'},
            },
            json: true,
            multipart: false,
            method: 'POST',
          },
          error: null,
          response: {statusCode: 200},
          body: {hits: {hits: ['bar', 'baz']}},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      elasticsearch: [{
        hits: {
          hits: ['bar', 'baz'],
        },
      }],
    },
    postCache: {},
  },
  ]
};

const elasticsearchInputSourceReliantTestCase = {
  name: 'Elasticsearch input requests test case2',
  dataDependencies: {
    dummy: kinesisNamesDependency(1000),
    elasticsearch: {
      accessSchema: elasticsearch.search,
      params: {
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: { 
          source: 'dummy',
          formatter: () => {
            return {queryString: 'input1'}
          }
        },
        apikey: {
          input: 'apikey',
          formatter: ({apikey}) => {
            return apikey;
          },
        },
      }
    },
  },
  inputs: {
    apikey: 'secretApiKey',
  },
  phases: [
  {
    time: 0,
    target: 'elasticsearch',
    preCache: {},
    preInputs: {
      apikey: 'secretApiKey',
    },
    phaseInputs: {
    },
    postInputs: {
      apikey: 'secretApiKey',
    },
    mocks: {
      dummy: {
        source: 'AWS',
        sourceConfig: successfulKinesisCall('listStreams', [{Limit: 100}], {StreamNames: ['foo', 'bar', 'baz']})
      },
      elasticsearch: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://www.example.com/_search',
            headers: {},
            qs: {apikey: 'secretApiKey'},
            body: {
              query: {queryString: 'input1'},
            },
            json: true,
            multipart: false,
            method: 'POST',
          },
          error: null,
          response: {statusCode: 200},
          body: {hits: {hits: ['bar', 'baz']}},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      dummy: ['foo', 'bar', 'baz'],
      elasticsearch: [{
        hits: {
          hits: ['bar', 'baz'],
        },
      }],
    },
    postCache: {
      dummy: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'baz']}]
    },
  },
  ]
};

const elasticsearchErrorTestCase = {
  name: 'Elasticsearch error test case with retry',
  dataDependencies: {
    elasticsearch: {
      accessSchema: elasticsearch.search,
      behaviors: {
        parallelLimit: 2,
        detectErrors: (e, r, b) => {
          console.log(e);
          console.log(r);
          console.log(b);
          return e;
        },
        retryParams: {times: 2},
      },
      params: {
        'apikey' : {value: 'secretApiKey'},
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: {
          value: {queryString: 'searchTerm'},
        },
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'elasticsearch',
    preCache: {},
    preInputs: {},
    mocks: {
      elasticsearch: {
        source: 'GENERIC_API',
        sourceConfig: [
          {
            callParameters: {
              url: 'https://www.example.com/_search',
              headers: {},
              qs: {apikey: 'secretApiKey'},
              body: {
                query: {queryString: 'searchTerm'},
              },
              multipart: false,
              json: true,
              method: 'POST',
            },
            error: "bad error",
            response: {statusCode: 400},
            body: null,
          },
          {
            callParameters: {
              url: 'https://www.example.com/_search',
              headers: {},
              qs: {apikey: 'secretApiKey'},
              body: {
                query: {queryString: 'searchTerm'},
              },
              json: true,
              multipart: false,
              method: 'POST',
            },
            error: null,
            response: {statusCode: 200},
            body: {hits: {hits: ['bar', 'baz']}},
          },
        ], 
      }
    },
    expectedError: null,
    expectedValues: {
      elasticsearch: [{
        hits: {
          hits: ['bar', 'baz'],
        },
      }],
    },
    postCache: {},
  },
  ]
};

const elasticsearchErrorDefaultTestCase = {
  name: 'Elasticsearch error test case without retry',
  dataDependencies: {
    elasticsearch: {
      accessSchema: elasticsearch.search,
      behaviors: {
        parallelLimit: 2,
      },
      params: {
        'apikey' : {value: 'secretApiKey'},
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: {
          value: {queryString: 'searchTerm'},
        },
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'elasticsearch',
    preCache: {},
    preInputs: {},
    mocks: {
      elasticsearch: {
        source: 'GENERIC_API',
        sourceConfig: [
          {
            callParameters: {
              url: 'https://www.example.com/_search',
              headers: {},
              qs: {apikey: 'secretApiKey'},
              body: {
                query: {queryString: 'searchTerm'},
              },
              json: true,
              multipart: false,
              method: 'POST',
            },
            error: "bad error",
            response: {statusCode: 400},
            body: null,
          },
        ], 
      }
    },
    expectedError: new Error('Error fetching results for schema elasticsearchSearch Error bad error'),
    expectedValues: {
      elasticsearch: void(0)
    },
    postCache: {},
  },
  ]
};

const elasticsearchInputTestCase = {
  name: 'Elasticsearch input requests test case',
  dataDependencies: {
    elasticsearch: {
      accessSchema: elasticsearch.search,
      params: {
        'apikey' : {value: 'secretApiKey'},
        apiConfig: {
          value: {
            host: 'www.example.com'
          },
        },
        query: {
          input: 'esSearchQuery',
          formatter: ({esSearchQuery}) => {
            return {queryString: esSearchQuery};
          },
        },
      }
    },
  },
  inputs: {
    esSearchQuery: 'input1',
  },
  phases: [
  {
    time: 0,
    target: 'elasticsearch',
    preCache: {},
    preInputs: {
      esSearchQuery: 'input1'
    },
    postInputs: {
      esSearchQuery: 'input1'
    },
    mocks: {
      elasticsearch: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://www.example.com/_search',
            headers: {},
            qs: {apikey: 'secretApiKey'},
            body: {
              query: {queryString: 'input1'},
            },
            json: true,
            multipart: false,
            method: 'POST',
          },
          error: null,
          response: {statusCode: 200},
          body: {hits: {hits: ['bar', 'baz']}},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      elasticsearch: [{
        hits: {
          hits: ['bar', 'baz'],
        },
      }],
    },
    postCache: {},
  },
  {
    time: 300,
    target: 'elasticsearch',
    preCache: {},
    inputOverrides: {esSearchQuery: 'inputOverride'},
    preInputs: {
      esSearchQuery: 'input1'
    },
    postInputs: {
      esSearchQuery: 'input1'
    },
    mocks: {
      elasticsearch: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://www.example.com/_search',
            headers: {},
            qs: {apikey: 'secretApiKey'},
            body: {
              query: {queryString: 'inputOverride'},
            },
            json: true,
            multipart: false,
            method: 'POST',
          },
          error: null,
          response: {statusCode: 200},
          body: {hits: {hits: ['qux', 'quux']}},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      elasticsearch: [{
        hits: {
          hits: ['qux', 'quux'],
        },
      }],
    },
    postCache: {},
  },
  {
    time: 500,
    target: 'elasticsearch',
    preCache: {},
    phaseInputs: {
      esSearchQuery: 'input3'
    },
    preInputs: {
      esSearchQuery: 'input1'
    },
    postInputs: {
      esSearchQuery: 'input3'
    },
    mocks: {
      elasticsearch: {
        source: 'GENERIC_API',
        sourceConfig: [{
          callParameters: {
            url: 'https://www.example.com/_search',
            headers: {},
            qs: {apikey: 'secretApiKey'},
            body: {
              query: {queryString: 'input3'},
            },
            json: true,
            multipart: false,
            method: 'POST',
          },
          error: null,
          response: {statusCode: 200},
          body: {hits: {hits: ['foo']}},
        }], 
      }
    },
    expectedError: null,
    expectedValues: {
      elasticsearch: [{
        hits: {
          hits: ['foo'],
        },
      }],
    },
    postCache: {},
  },
  ]
};

const awsCachingTargetingTestCase = {
  name: 'Single-source targeted caching request case',
  dataDependencies: {
    kinesisNames: kinesisNamesDependency(1000),
    kinesisStreams: {
      accessSchema: kinesisStream,
      params: {
        StreamName: {source: 'kinesisNames'},
        apiConfig: apiConfig(),
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'kinesisNames',
    preCache: {},
    mocks: {
      kinesisNames: {
        source: 'AWS',
        sourceConfig: successfulKinesisCall('listStreams', [{Limit: 100}], {StreamNames: ['foo', 'bar', 'baz']})
      }
    },
    expectedValues: {
      kinesisNames: ['foo', 'bar', 'baz']
    },
    expectedError: null,
    postCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'baz']}]
    },
  },
  {
    time: 500,
    mocks: {},
    target: ['kinesisNames'],
    preCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'baz']}]
    },
    postCache: {
      kinesisNames: [{collectorArgs: {apiConfig: apiConfig().value}, r: ['foo', 'bar', 'baz']}]
    },
    expectedValues: {
      kinesisNames: ['foo', 'bar', 'baz']
    },
    expectedError: null,
  }]
};

const awsRateLimitTestCase = {
  name: 'Rate limiting case',
  dataDependencies: {
    kinesisStreams: {
      accessSchema: kinesisStream,
      behaviors: {parallelLimit: 2},
      params: {
        StreamName: {
          value: ['foo', 'bar', 'baz']
        },
        apiConfig: apiConfig(),
      }
    },
  },
  phases: [
  {
    time: 0,
    target: 'kinesisStreams',
    preCache: {},
    mocks: {
      kinesisStreams: {
        source: 'AWS',
        sourceConfig:[ 
          successfulKinesisCall('describeStream', [{StreamName: 'foo'}], {StreamDescription: {StreamName: 'fooStream'}}),
          successfulKinesisCall('describeStream', [{StreamName: 'bar'}], {StreamDescription: {StreamName: 'barStream'}}),
          successfulKinesisCall('describeStream', [{StreamName: 'baz'}], {StreamDescription: {StreamName: 'bazStream'}}),
        ]
      }
    },
    expectedError: null,
    expectedValues: {
      kinesisStreams: _.map(['foo', 'bar', 'baz'], (s) => {return {StreamName: `${s}Stream`};}),
    },
    postCache: {
    },
  },
  ],
};

const incompleteRequestAwsTestCase = {
  name: 'Multiple-request AWS dependency',
  dataDependencies: {
    kinesisNames: kinesisNamesDependency()
  },
  namedMocks: {
    kinesisNames: {
      source: 'AWS',
      sourceConfig: [
        successfulKinesisCall('listStreams', [{Limit: 100}], {HasMoreStreams: true, StreamNames: ['foo', 'bar', 'baz']}),
        successfulKinesisCall('listStreams', [{Limit: 100, ExclusiveStartStreamName: 'baz'}], {StreamNames: ['qux', 'quux', 'quuux']}, true),
      ],
      expectedValue: ['foo', 'bar', 'baz', 'qux', 'quux', 'quuux']
    }
  },
};

const doubleSourceUseTestCase = {
  name: 'Basic Double-AWS-request case',
  dataDependencies: {
    kinesisStreams1: {
      accessSchema: kinesisStream,
      params: {
        StreamName: {
          source: 'kinesisNames',
          formatter: ({kinesisNames}) => kinesisNames,
        },
        apiConfig: apiConfig(),
      }
    },
    kinesisStreams2: {
      accessSchema: kinesisStream,
      params: {
        StreamName: {
          source: 'kinesisNames',
          formatter: ({kinesisNames}) => kinesisNames,
        },
        apiConfig: apiConfig(),
      }
    },
    kinesisNames: kinesisNamesDependency(),
  },
  namedMocks: {
    kinesisNames: kinesisNamesMock(),
    kinesisStreams1: {
      source: 'AWS',
      sourceConfig: [
        successfulKinesisCall('describeStream', [{StreamName: 'foo'}], {StreamDescription: {StreamName: 'fooStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'bar'}], {StreamDescription: {StreamName: 'barStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'baz'}], {StreamDescription: {StreamName: 'bazStream'}}),
      ],
      expectedValue: _.map(['foo', 'bar', 'baz'], (s) => {return {StreamName: `${s}Stream`};})
    },
    kinesisStreams2: {
      source: 'AWS',
      sourceConfig: [
        successfulKinesisCall('describeStream', [{StreamName: 'foo'}], {StreamDescription: {StreamName: 'fooStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'bar'}], {StreamDescription: {StreamName: 'barStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'baz'}], {StreamDescription: {StreamName: 'bazStream'}}),
      ],
      expectedValue: _.map(['foo', 'bar', 'baz'], (s) => {return {StreamName: `${s}Stream`};})
    }
  },
};

const basicAwsWithFormatter = {
  name: 'Basic Single-AWS-request case, with a formatter',
  dataDependencies: {
    kinesisNames: {
      accessSchema: kinesisStreams,
      params: {
        apiConfig: apiConfig(),
      },
      formatter: (ar) => ar[0]
    }
  },
  namedMocks: {
    kinesisNames: {
      source: 'AWS',
      sourceConfig: successfulKinesisCall('listStreams', [{Limit: 100}], {StreamNames: ['foo', 'bar', 'baz']}),
      expectedValue: 'foo'
    }
  },
  implicitMocks: []
};

const basicAwsWithGenerator = {
  name: 'Basic Single-AWS-request case, with a formatter',
  dataDependencies: {
    kinesisNames: {
      accessSchema: kinesisStreams,
      params: {
        apiConfig: apiConfig(),
      },
    }
  },
  namedMocks: {
    kinesisNames: {
      source: 'AWS',
      sourceConfig: successfulKinesisCall('listStreams', [{Limit: 100}], {StreamNames: ['foo', 'bar', 'baz']}),
      expectedValue: ['foo', 'bar', 'baz']
    }
  },
  implicitMocks: []
};

const doubleSourceTestCase = {
  name: 'Double source test case',
  dataDependencies: {
    jpl: {
      accessSchema: kinesisStream,
      params: {
        apiConfig: apiConfig(),
        StreamName: {
          value: 'jpl'
        }
      }
    },
    mpls: {
      accessSchema: kinesisStream,
      params: {
        apiConfig: apiConfig(),
        StreamName: {
          value: 'mpls'
        }
      }
    },
    multiSource: {
      accessSchema: kinesisStream,
      params: {
        apiConfig: apiConfig(),
        StreamName: {
          source: ['mpls', 'jpl'],
          formatter: ({mpls, jpl}) => `${mpls[0].StreamName}-${jpl[0].StreamName}`
        }
      }
    }
  },
  namedMocks: {
    jpl: { 
      source: 'AWS',
      sourceConfig: successfulKinesisCall('describeStream', [{StreamName: 'jpl'}], {StreamDescription: {StreamName: 'jplStream'}}),
      expectedValue: [{StreamName: 'jplStream'}]
    },
    mpls: { 
      source: 'AWS',
      sourceConfig: successfulKinesisCall('describeStream', [{StreamName: 'mpls'}], {StreamDescription: {StreamName: 'mplsStream'}}),
      expectedValue: [{StreamName: 'mplsStream'}]
    },
    multiSource: { 
      source: 'AWS',
      sourceConfig: successfulKinesisCall('describeStream', [{StreamName: 'mplsStream-jplStream'}], {StreamDescription: {StreamName: 'multiSourceStream'}}),
      expectedValue: [{StreamName: 'multiSourceStream'}]
    },
  }
};

const dependentAwsTestCase = {
  name: 'Basic dependent-AWS-request case',
  dataDependencies: {
    kinesisName: {
      accessSchema: kinesisStream,
      behaviors: {parallelLimit: 1},
      params: {
        apiConfig: apiConfig(),
      }
    }
  },
  namedMocks: {
    kinesisName: {
      source: 'AWS',
      sourceConfig: [
        successfulKinesisCall('describeStream', [{StreamName: 'foo'}], {StreamDescription: {StreamName: 'fooStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'bar'}], {StreamDescription: {StreamName: 'barStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'baz'}], {StreamDescription: {StreamName: 'bazStream'}}),
      ],
      expectedValue: _.map(['foo', 'bar', 'baz'], (s) => {return {StreamName: `${s}Stream`};})
    }
  },
  implicitMocks: [
    kinesisNamesMock(),
  ]
};

const dependentAwsTestCaseWithOneValue = {
  name: 'Basic dependent-AWS-request case',
  dataDependencies: {
    kinesisName: {
      accessSchema: kinesisStreamWithAnotherParam,
      params: {
        otherParam: {value: ['foo', 'bar', 'baz']},
        apiConfig: apiConfig(),
      }
    }
  },
  namedMocks: {
    kinesisName: {
      source: 'AWS',
      sourceConfig: [
        successfulKinesisCall('describeStream', [{StreamName: 'foo', otherParam: 'foo'}], {StreamDescription: {StreamName: 'fooStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'bar', otherParam: 'bar'}], {StreamDescription: {StreamName: 'barStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'baz', otherParam: 'baz'}], {StreamDescription: {StreamName: 'bazStream'}}),
      ],
      expectedValue: _.map(['foo', 'bar', 'baz'], (s) => {return {StreamName: `${s}Stream`};})
    }
  },
  implicitMocks: [
    kinesisNamesMock(),
  ]
};

const dependentAwsTestCaseWithAnOptionalParam = {
  name: 'Test case with an optional param specified in the accessschema and provided',
  dataDependencies: {
    kinesisName: {
      accessSchema: kinesisStreamWithANonRequiredParam,
      params: {
        otherParam: {value: ['foo', 'bar', 'baz']},
        apiConfig: apiConfig(),
      }
    }
  },
  namedMocks: {
    kinesisName: {
      source: 'AWS',
      sourceConfig: [
        successfulKinesisCall('describeStream', [{StreamName: 'foo', otherParam: 'foo.foo'}], {StreamDescription: {StreamName: 'fooStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'bar', otherParam: 'bar.foo'}], {StreamDescription: {StreamName: 'barStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'baz', otherParam: 'baz.foo'}], {StreamDescription: {StreamName: 'bazStream'}}),
      ],
      expectedValue: _.map(['foo', 'bar', 'baz'], (s) => {return {StreamName: `${s}Stream`};})
    }
  },
  implicitMocks: [
    kinesisNamesMock(),
  ]
};

const dependentAwsTestCaseWithAnOptionalParamSpecifiedSingly = {
  name: 'Test case with an optional param specified in the accessschema and provided as a single value',
  dataDependencies: {
    kinesisName: {
      accessSchema: kinesisStreamWithANonRequiredParam,
      params: {
        otherParam: {value: 'foo'},
        apiConfig: apiConfig(),
      }
    }
  },
  namedMocks: {
    kinesisName: {
      source: 'AWS',
      sourceConfig: [
        successfulKinesisCall('describeStream', [{StreamName: 'foo', otherParam: 'foo.foo'}], {StreamDescription: {StreamName: 'fooStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'bar', otherParam: 'foo.foo'}], {StreamDescription: {StreamName: 'barStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'baz', otherParam: 'foo.foo'}], {StreamDescription: {StreamName: 'bazStream'}}),
      ],
      expectedValue: _.map(['foo', 'bar', 'baz'], (s) => {return {StreamName: `${s}Stream`};})
    }
  },
  implicitMocks: [
    kinesisNamesMock(),
  ]
};

const dependentAwsTestCaseWithAnUnspecifiedOptionalParam = {
  name: 'Test case with an Optional Param specified in the accessschema but not provided',
  dataDependencies: {
    kinesisName: {
      accessSchema: kinesisStreamWithANonRequiredParam,
      params: {
        apiConfig: apiConfig(),
      }
    }
  },
  namedMocks: {
    kinesisName: {
      source: 'AWS',
      sourceConfig: [
        successfulKinesisCall('describeStream', [{StreamName: 'foo'}], {StreamDescription: {StreamName: 'fooStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'bar'}], {StreamDescription: {StreamName: 'barStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'baz'}], {StreamDescription: {StreamName: 'bazStream'}}),
      ],
      expectedValue: _.map(['foo', 'bar', 'baz'], (s) => {return {StreamName: `${s}Stream`};})
    }
  },
  implicitMocks: [
    kinesisNamesMock(),
  ]
};

const awsWithParamFormatter = {
  name: 'Basic Single-AWS-request case, with a param formatter',
  dataDependencies: {
    kinesisNames: kinesisNamesDependency(),
    kinesisStreams: {
      accessSchema: kinesisStream,
      params: {
        apiConfig: apiConfig(),
        StreamName: {
          source: 'kinesisNames',
          formatter: ({kinesisNames}) => _.filter(kinesisNames, (n) => n[0] === 'b')
        }
      }
    }
  },
  namedMocks: {
    kinesisNames: kinesisNamesMock(),
    kinesisStreams: {
      source: 'AWS',
      sourceConfig: [
        successfulKinesisCall('describeStream', [{StreamName: 'baz'}], {StreamDescription: {StreamName: 'bazStream'}}),
        successfulKinesisCall('describeStream', [{StreamName: 'bar'}], {StreamDescription: {StreamName: 'barStream'}}),
      ],
      expectedValue: _.map(['bar', 'baz'], (s) => {return {StreamName: `${s}Stream`};}),
    }
  },
  implicitMocks: []
};

const basicTestCases = [
  basicAwsTestCase,
  twoAWSAndOneSyntheticTestCase,
  basicAwsWithGenerator,
  basicAwsWithFormatter,
  awsWithParamFormatter,
  dependentAwsTestCase,
  dependentAwsTestCaseWithOneValue,
  dependentAwsTestCaseWithAnOptionalParam,
  dependentAwsTestCaseWithAnUnspecifiedOptionalParam,
  dependentAwsTestCaseWithAnOptionalParamSpecifiedSingly,
  doubleSourceTestCase,
  doubleSourceUseTestCase,
  incompleteRequestAwsTestCase,
];

const cachingTestCases = [
  awsRateLimitTestCase,
  basicAwsCachingTestCase,
  elasticsearchInputTestCase,
  elasticsearchErrorTestCase,
  elasticsearchErrorDefaultTestCase,
  elasticsearchInputNoDefaultTestCase,
  elasticsearchInputOptionalDefaultTestCase,
  elasticsearchInputMissingTestCase,
  elasticsearchInputMissingTargetedTestCase,
  elasticsearchInputSourceReliantTestCase,
  elasticsearchInputPlusDependencyTestCase,
  slackInputTestCase,
  slackInputFormattingTestCase,
  slackInputUrlParamTestCase,
  slackInputUrlApiConfigParamTestCase,
  slackInputErrorHandlerInAccessSchemaTestCase,
  slackInputErrorHandlerInDependencySchemaTestCase,
  vaultTreeTestCase,
  awsCachingTargetingTestCase,
  awsExpiringCacheTestCase,
  awsCachedDependencyRequirementTestCase,
];

executeBasicTestSuite('Basic report tests', basicTestCases);
executeCachingTestSuite('Caching report tests', cachingTestCases);
