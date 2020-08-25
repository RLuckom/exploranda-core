const _ = require('lodash');

const namespaceDetails = {
  name: 'Athena',
  constructorArgs: {}
};

const startQueryExecution = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'AthenaQuery',
  value: {
    path: 'QueryExecutionId',
  },
  requiredParams: {
    QueryString: {},
    QueryExecutionContext: {},
    ResultConfiguration: {},
  },
  apiMethod: 'startQueryExecution',
};

const getQueryExecution = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'AthenaQueryExecution',
  value: {
    path: 'QueryExecution',
  },
  requiredParams: {
    QueryExecutionId: {}
  },
  apiMethod: 'getQueryExecution',
};

const getQueryResults = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'athenaQueryResults',
  value: {
    path: _.identity,
  },
  requiredParams: {
    QueryExecutionId: {}
  },
  apiMethod: 'getQueryResults',
  incompleteIndicator: 'NextToken',
  nextBatchParamConstructor: (params, {NextToken}) => {
    return _.merge({}, params, {NextToken});
  },
};


module.exports = {
  startQueryExecution, getQueryExecution, getQueryResults
}
