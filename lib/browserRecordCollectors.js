module.exports = {
  GENERIC_API: require('./recordCollectors/fetchRecordCollector').lookUpRecords,
  GENERIC_FUNCTION: require('./recordCollectors/genericFunctionRecordCollector').lookUpRecords,
  SYNTHETIC: require('./recordCollectors/syntheticRecordCollector').transform,
  FILE_TYPE: require('./recordCollectors/filetypeRecordCollector').transform,
  AWS: require('./recordCollectors/awsRecordCollector').lookUpRecords
};
