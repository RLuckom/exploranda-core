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

const update = {
  dataSource: 'AWS',
  namespaceDetails: {
    name: 'DynamoDB',
    constructorArgs: {}
  },
  name: 'Update',
  value: {
    path: (arg) => {
      if (_.get(arg, 'AttributeValues')) {
       arg.AttributeValues = converter.unmarshall(arg.AttributeValues)
      }
      return arg
    }
  },
  requiredParams: {
    TableName: {},
    Key: {
      formatter: (i) =>  converter.marshall(i)
    },
    UpdateExpression: {},
  },
  optionalParams: {
    ReturnValues: {},
    ConditionExpression: {},
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {
      formatter: (i) => _.reduce(i, (a, v, k) => {
        if (_.isString(v)) {
          a[k] = {'S': v}
        } else if (_.isNumber(v)) {
          a[k] = {'N': `${v}`}
        } else if (v === true || v === false) {
          a[k] = {'BOOL': v}
        } else {
          a[k] = converter.marshall(v)
        }
        return a
      }, {})
    },
    ReturnConsumedCapacity: {},
    ReturnItemCollectionMetrics: {},
  },
  params: {
    ReturnValues: 'NONE',
  },
  apiMethod: 'updateItem',
};

/* Notes on batchexecute:
 * if the table name has special characters it should be enclosed in double quotes
 * contrary to the docs (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.multiplestatements.batching.html ) a string param in a literal should not have single quotes around the ?
 * you can't use exists w/ this api (only transaction request)
 * you can't perform multiple updates on the same unique keyed item (even in multiple statements)
 */
const batchExecuteStatement = {
  dataSource: 'AWS',
  namespaceDetails: {
    name: 'DynamoDB',
    constructorArgs: {}
  },
  name: 'ExecuteStatement',
  value: {
    path: _.identity,
  },
  requiredParams: {
    Statements: {
      detectArray: (statements) => {
        return _.isArray(_.get(statements, 0))
      }
    },
  },
  optionalParams: {
    ConsistentRead: {},
  },
  apiMethod: 'batchExecuteStatement',
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
  getItem, putItem, scan, query, deleteItem, update, batchExecuteStatement,
};
