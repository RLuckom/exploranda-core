const _ = require('lodash');
const {buildSDKCollector} = require('./baseRecordCollector');

function transform(modules, sourceSchema, paramSet) {
  const FileType = modules['file-type']
  const method = _.get(sourceSchema, 'apiMethod')
  return (input, callback) => {
    FileType[method](paramSet.file).then((r) => callback(null, r)).catch((e) => callback(e))
  }
}

module.exports = {
  transform: buildSDKCollector({getApi: transform, dependencyMap: {"file-type": 'file-type/browser'}})
}
