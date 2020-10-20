const _ = require('lodash');
const {buildSDKCollector} = require('./baseRecordCollector');

function transform(dependencies, {transformation}) {
  return (params, callback) => {
    return setTimeout(() => {
      callback(null, transformation(params));
    }, 0);
  };
}

module.exports = {
  transform: buildSDKCollector({getApi: transform}),
};
