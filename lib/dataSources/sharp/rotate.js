const _ = require('lodash')
const namespaceDetails = {
  name: 'Sharp',
  constructorArgs: {}
};

const rotateOne = {
  dataSource: 'SHARP',
  returnsPromise: true,
  namedArguments: ['angle'],
  name: 'rotate',
  value: {
    path: _.identity,
  },
  requiredParams: {
    image: {},
  },
  optionalParams: {
    angle: {},
    background: {},
  },
  apiMethod: 'rotate',
};

module.exports = {
  rotateOne
};
