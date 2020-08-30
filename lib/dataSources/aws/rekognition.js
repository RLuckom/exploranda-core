const _ = require('lodash');

const namespaceDetails = {
  name: 'Rekognition',
  constructorArgs: {}
};

const detectLabels = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'detectLabels',
  value: {
    path: 'Labels',
  },
  requiredParams: {
    Image : {}
  },
  apiMethod: 'detectLabels',
};

const detectText = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'detectText',
  value: {
    path: 'TextDetections',
  },
  requiredParams: {
    Image : {}
  },
  apiMethod: 'detectText',
};

const detectFaces = {
  dataSource: 'AWS',
  namespaceDetails,
  name: 'detectFaces',
  value: {
    path: 'FaceDetails',
  },
  requiredParams: {
    Image : {}
  },
  optionalParams: {
    Attribute : {
      detectArray: (res) => _.isArray(_.get(res, 0))
    },
  },
  apiMethod: 'detectFaces',
};

module.exports = {
  detectLabels,
  detectText,
  detectFaces,
};
