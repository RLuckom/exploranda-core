const _ = require('lodash');

function dockerApiAccessSchemaBuilderGenerator(name, required, pathParamKeys, queryParamKeys, defaults) {
  return function() {
    const args = Array.prototype.slice.call(arguments);
    return {
      accessSchema: {
        dataSource: 'GENERIC_API',
        name,
        pathParamKeys,
        queryParamKeys,
        requiredParams: _.reduce(required, (acc, n) => {
          acc[n] = {};
          return acc;
        }, {}),
        params: defaults
      },
      params: _.fromPairs(_.zip(required, args))
    };
  }
}

module.exports = {
  authBuilder: dockerApiAccessSchemaBuilderGenerator('dockerAuth', ['apiConfig', 'scope', 'service'], [], ['scope', 'service']),
  tagsBuilder: dockerApiAccessSchemaBuilderGenerator('dockerTags', ['apiConfig'], [], [])
};
