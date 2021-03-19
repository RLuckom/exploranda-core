module.exports = {
  GENERIC_API: require('./recordCollectors/fetchRecordCollector').lookUpRecords,
  AWS: require('./recordCollectors/awsRecordCollector').lookUpRecords
};
