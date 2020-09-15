const _ = require('lodash');
const sharp = require("sharp")
const {buildSDKCollector} = require('./baseRecordCollector');

function transform(sourceSchema, paramSet) {
  const constructorArgs = _.merge({},
    _.get(paramSet, 'apiConfig'),
  );
  delete paramSet.apiConfig;
  const apiObject = sharp(paramSet.image, constructorArgs)
  if (sourceSchema.returnsPromise) {
    return function(input, callback) {
      delete paramSet.image;
      const args = []
      _.each(sourceSchema.namedArguments, (na) => {
        args.push(paramSet[na])
        delete paramSet[na]
      })
      args.push(paramSet)
      apiObject[sourceSchema.apiMethod].apply(apiObject, args).toBuffer().then((buf) => callback(null, buf)).catch(callback)
    }
  } else { 
    return _.bind(apiObject[sourceSchema.apiMethod], apiObject);
  }
}

module.exports = {
  transform: buildSDKCollector(transform)
}
