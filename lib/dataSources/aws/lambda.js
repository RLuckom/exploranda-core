const _ = require('lodash');

const namespaceDetails = {
  name: 'Lambda',
  constructorArgs: {}
};

const invoke = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'invoke',
  value: {
    path: _.identity,
  },
  apiMethod: 'invoke',
  requiredParams: {
    FunctionName: {},
  },
  optionalParams: {
    InvocationType: {},
    LogType: {},
    ClientContext: {},
    Payload: {},
  }
};

module.exports = {invoke}
