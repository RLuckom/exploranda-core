module.exports = {
  GENERIC_API: require('./recordCollectors/fetchRecordCollector').lookUpRecords,
  FILE_TYPE: require('./recordCollectors/filetypeRecordCollector').transform,
  AWS: require('./recordCollectors/awsRecordCollector').lookUpRecords
};
