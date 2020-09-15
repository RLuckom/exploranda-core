module.exports = {
  GENERIC_API: require('./recordCollectors/genericApiRecordCollector').lookUpRecords,
  SHARP: require('./recordCollectors/sharpRecordCollector').transform,
  SYNTHETIC: require('./recordCollectors/syntheticRecordCollector').transform,
  GOOGLE: require('./recordCollectors/gcpRecordCollector').lookUpRecords,
  AWS: require('./recordCollectors/awsRecordCollector').lookUpRecords
};
