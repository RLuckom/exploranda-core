const _ = require('lodash')

const resizeOne = {
  dataSource: 'SHARP',
  returnsPromise: true,
  namedArguments: ['width', 'height'],
  name: 'resize',
  value: {
    path: _.identity,
  },
  requiredParams: {
    image: {},
  },
  optionalParams: {
    width: {},
    height: {},
    fit: {},
    position: {},
    background: {},
    kernel: {},
    withoutEnlargement: {},
    fastShrinkOnLoad: {}
  },
  apiMethod: 'resize',
};

module.exports = {
  resizeOne
};
