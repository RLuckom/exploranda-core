const _ = require('lodash');
const {buildSDKCollector} = require('./baseRecordCollector.js');

function getApi({ AWS }, sourceSchema, paramSet) {
  const constructorArgs = _.merge({},
    _.get(paramSet, 'apiConfig'),
    sourceSchema.namespaceDetails.constructorArgs
  );
  delete paramSet.apiConfig;
  const apiObject = new AWS[sourceSchema.namespaceDetails.name](constructorArgs)
  return _.bind(apiObject[sourceSchema.apiMethod], apiObject);
}

module.exports = {
  lookUpRecords: buildSDKCollector({getApi, dependencyMap: {AWS: 'aws-sdk'}})
};
