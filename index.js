const {Gopher} = require('./lib/gopher');
const { buildSDKCollector } = require('./lib/recordCollectors/baseRecordCollector.js')
const { genericFunctionRecordCollector } = require('./lib/recordCollectors/genericFunctionRecordCollector.js');
const dataSources = require('./lib/dataSources');

module.exports = {
  dataSources,
  Gopher,
  buildSDKCollector,
  genericFunctionRecordCollector,
  helpers: {kubernetes: require('./lib/dataSources/kubernetes/accessSchemaBuilder')},
};
