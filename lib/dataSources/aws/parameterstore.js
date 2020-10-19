const _ = require('lodash');

const namespaceDetails = {
  name: 'SSM',
  constructorArgs: {}
};

const getParameter = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'getParameter',
  value: {
    path: 'Parameter'
  },
  requiredParams: {
    Name: {},
  },
  optionalParams: {
    WithDecryption: {},
  },
  apiMethod: 'getParameter',
};

module.exports = {
  getParameter
};
