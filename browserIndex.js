'use strict;'
const _ = require('lodash');
const asyncLib = require('async')
const {Gopher} = require('./lib/gopher');
const { buildSDKCollector } = require('./lib/recordCollectors/baseRecordCollector.js')
const { genericFunctionRecordCollector } = require('./lib/recordCollectors/genericFunctionRecordCollector.js');
const defaultRecordCollectors = require('./lib/browserRecordCollectors');
const dataSources = require('./lib/dataSources');

if (!window['_']) {
  window._ = _
}

if (!window['asyncLib']) {
  window.asyncLib = asyncLib
}

module.exports = {
  dataSources,
  Gopher: _.partial(Gopher, defaultRecordCollectors),
  buildSDKCollector,
  genericFunctionRecordCollector,
  helpers: {kubernetes: require('./lib/dataSources/kubernetes/accessSchemaBuilder')},
  _,
  asyncLib
};
