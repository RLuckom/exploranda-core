const _ = require('lodash');
const sqsNamespaceDetails = {
  name: 'SQS',
  constructorArgs: {
  }
};

const sendMessage = {
  dataSource: 'AWS',
  name: 'SQSSendMessage',
  namespaceDetails: sqsNamespaceDetails,
  apiMethod: 'sendMessage',
  value: {
    path: _.identity
  },
  requiredParams: {
    QueueUrl: {},
    MessageBody: {},
  },
  OptionalParams: {
    DelaySeconds: {},
    MessageGroupId: {},
  }
}

const sendMessageBatch = {
  dataSource: 'AWS',
  name: 'SQSSendMessageBatch',
  namespaceDetails: sqsNamespaceDetails,
  apiMethod: 'sendMessageBatch',
  value: {
    path: _.identity
  },
  requiredParams: {
    QueueUrl: {},
    Entries: {
      detectArray: (v) => _.isArray(_.get(v, '[0]'))
    },
  },
}

module.exports = {
  sendMessage, sendMessageBatch
}
