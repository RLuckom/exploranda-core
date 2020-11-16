const _ = require('lodash');
let converter = _.identity
try {
  converter = require('aws-sdk').DynamoDB.Converter;
} catch(e) {}

const namespaceDetails = {
  name: 'DynamoDB',
  constructorArgs: {}
};

const scanAll = {
  dataSource: 'AWS',
  namespaceDetails: {
    name: 'DynamoDB',
    constructorArgs: {}
  },
  name: 'Scan',
  value: {
    path: ({Items}) => _.map(Items, (i) => converter.unmarshall(i))
  },
  incompleteIndicator: 'LastEvaluatedKey',
  nextBatchParamConstructor: (params, {LastEvaluatedKey}) => {
    return _.merge({}, params, {ExclusiveStartKey: LastEvaluatedKey});
  },
  requiredParams: {
    TableName: {},
  },
  optionalParams: {
    AttributesToGet: {},
    ConsistentRead: {},
    FilterExpression: {},
    ProjectionExpression: {},
    Select: {},
    Segment: {},
    TotalSegments: {},
  },
  apiMethod: 'scan',
};

const scan = {
  dataSource: 'AWS',
  namespaceDetails: {
    name: 'DynamoDB',
    constructorArgs: {}
  },
  name: 'Scan',
  value: {
    path: (value) => {
      return {...value, ...{Items: _.map(Items, (i) => converter.unmarshall(i))}}
    },
  },
  incompleteIndicator: 'LastEvaluatedKey',
  nextBatchParamConstructor: (params, {LastEvaluatedKey}) => {
    return _.merge({}, params, {ExclusiveStartKey: LastEvaluatedKey});
  },
  requiredParams: {
    TableName: {},
  },
  optionalParams: {
    AttributesToGet: {},
    ConsistentRead: {},
    FilterExpression: {},
    ProjectionExpression: {},
    Select: {},
    Segment: {},
    TotalSegments: {},
  },
  apiMethod: 'scan',
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
  getItem, putItem, scan
};
