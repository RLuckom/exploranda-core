const _ = require('lodash');
const converter = require('aws-sdk').DynamoDB.Converter;

const namespaceDetails = {
  name: 'DynamoDB',
  constructorArgs: {}
};

const getItem = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'dynamodbGetItem',
  value: {
    path: ({Item}) => converter.unmarshall(Item),
  },
  requiredParams: {
    Key: {
      formatter: (i) => converter.marshall(i)
    },
    TableName: {},
  },
  optionalParams: {
    ConsistentRead: {},
    ReturnConsumedCapacity: {},
    ProjectionExpression: {},
    ExpressionAttributeNames: {},
  },
  apiMethod: 'getItem',
};

const putItem = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'dynamodbPutItem',
  value: {
    path: _.identity,
  },
  requiredParams: {
    Item: {
      formatter: (i) => converter.marshall(i)
    },
    TableName: {},
  },
  optionalParams: {
    ReturnConsumedCapacity: {},
    ExpressionAttributeNames: {},
  },
  apiMethod: 'putItem',
};

module.exports = {
  getItem, putItem
};
