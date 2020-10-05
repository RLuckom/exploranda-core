const _ = require('lodash');

const namespaceDetails = {
  name: 'ApiGatewayManagementApi',
  constructorArgs: {}
};

const deleteConnection = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'DeleteApiGatewayConnection',
  value: {
    path: _.identity,
  },
  requiredParams: {
    ConnectionId: {},
  },
  apiMethod: 'deleteConnection',
};

const getConnection = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'GetApiGatewayConnection',
  value: {
    path: _.identity,
  },
  requiredParams: {
    ConnectionId: {},
  },
  apiMethod: 'getConnection',
};

const postToConnection = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'PostToApiGatewayConnection',
  value: {
    path: _.identity,
  },
  requiredParams: {
    ConnectionId: {},
    Data: {},
  },
  apiMethod: 'postToConnection',
};

module.exports = {
  deleteConnection,
  getConnection,
  postToConnection
};
