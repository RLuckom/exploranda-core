const {Gopher} = require('./lib/gopher');
const { buildSDKCollector } = require('./lib/recordCollectors/baseRecordCollector.js')
const dataSources = require('./lib/dataSources');

module.exports = {
  dataSources,
  Gopher,
  buildSDKCollector,
  helpers: {kubernetes: require('./lib/dataSources/kubernetes/accessSchemaBuilder')},
};
