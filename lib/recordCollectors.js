module.exports = {
  REQUEST: require('./recordCollectors/requestRecordCollector').doRequest,
  GENERIC_API: require('./recordCollectors/genericApiRecordCollector').lookUpRecords,
  SYNTHETIC: require('./recordCollectors/syntheticRecordCollector').transform,
  GOOGLE: require('./recordCollectors/gcpRecordCollector').lookUpRecords,
  AWS: require('./recordCollectors/awsRecordCollector').lookUpRecords
};
