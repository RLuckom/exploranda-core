const _ = require('lodash');
const {Gopher} = require('./lib/gopher');
const { buildSDKCollector } = require('./lib/recordCollectors/baseRecordCollector.js')
const { genericFunctionRecordCollector } = require('./lib/recordCollectors/genericFunctionRecordCollector.js');
const defaultRecordCollectors = require('./lib/recordCollectors');
const dataSources = require('./lib/dataSources');

module.exports = {
  dataSources,
  Gopher: _.partial(Gopher, defaultRecordCollectors),
  buildSDKCollector,
  genericFunctionRecordCollector,
  helpers: {kubernetes: require('./lib/dataSources/kubernetes/accessSchemaBuilder')},
};
