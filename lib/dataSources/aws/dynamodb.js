const _ = require('lodash');
let converter = {
  marshall: _.identity,
  unmarshall: _.identity,
}
try {
  converter = require('aws-sdk').DynamoDB.Converter;
} catch(e) {
  try {
    converter = AWS.DynamoDB.Converter
  } catch(e) {
  }
}

const namespaceDetails = {
  name: 'DynamoDB',
  constructorArgs: {}
};

const query = {
  dataSource: 'AWS',
  namespaceDetails: {
    name: 'DynamoDB',
    constructorArgs: {}
  },
  name: 'Query',
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
    ConditionalOperator: {},
    ConsistentRead: {},
    ExclusiveStartKey: {},
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {
      formatter: (i) => _.reduce(i, (a, v, k) => {
        if (_.isString(v)) {
          a[k] = {'S': v}
        } else if (_.isNumber(v)) {
          a[k] = {'N': v}
        } else if (v === true || v === false) {
          a[k] = {'BOOL': v}
        } else {
          a[k] = converter.marshall(v)
        }
        return a
      }, {})
    },
    FilterExpression: {},
    IndexName: {},
    KeyConditionExpression: {},
    KeyConditions: {},
    Limit: {},
    ProjectionExpression: {},
    QueryFilter: {},
    ReturnConsumedCapacity: {},
    ScanIndexForward: {},
    Select: {},
  },
  apiMethod: 'query',
};

const deleteItem = {
  dataSource: 'AWS',
  namespaceDetails: {
    name: 'DynamoDB',
    constructorArgs: {}
  },
  name: 'Delete',
  requiredParams: {
    TableName: {},
    Key: {
      formatter: (i) => _.reduce(i, (a, v, k) => {
        if (_.isString(v)) {
          a[k] = {'S': v}
        } else if (_.isNumber(v)) {
          a[k] = {'N': v}
        } else if (v === true || v === false) {
          a[k] = {'BOOL': v}
        } else if (_.isArray(v)) {
          a[k] = _.map(v, converter.marshall)
        } else {
          a[k] = converter.marshall(v)
        }
        return a
      }, {})
    }
  },
  apiMethod: 'deleteItem',
};

const scan = {
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
  getItem, putItem, scan, query, deleteItem,
};
