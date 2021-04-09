const _ = require('lodash')
const namespaceDetails = {
  name: 'Filetype',
};

const fromBuffer = {
  dataSource: 'FILE_TYPE',
  name: 'FileTypeFromBuffer',
  value: {
    path: _.identity,
  },
  requiredParams: {
    file: {},
  },
  apiMethod: 'fromBuffer',
};

module.exports = {
  fromBuffer
};
